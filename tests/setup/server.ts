import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { request as httpRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { createApp, type AppDependencies } from '../../server/app.js'
import { loadServerConfig, type ServerConfig } from '../../server/config/index.js'

export const OUTSIDE_SECRET = 'TOP-SECRET-OUTSIDE-THE-WEB-ROOT'
export const HIDDEN_SECRET = 'HIDDEN-FILE-SECRET'
export const SHELL = '<!doctype html><html><body><div id="root"></div></body></html>'
export const ASSET_BODY = 'console.log("roadsmith test asset ".repeat(40))'.repeat(8)
export const PUBLIC_ORIGIN = 'https://app.example.com'

export type TestServer = {
  url: string
  config: ServerConfig
  logs: string[]
  /** The folder the server treats as the web root. */
  staticDirectory: string
  stop: () => Promise<void>
}

type StartOptions = {
  env?: Record<string, string>
  config?: Partial<ServerConfig>
  deps?: AppDependencies
}

/** A throw-away built client: a shell, hashed assets with compressed twins, and the files an attacker would go looking for. */
async function writeSite(root: string): Promise<string> {
  const site = path.join(root, 'dist')
  await mkdir(path.join(site, 'assets'), { recursive: true })
  await writeFile(path.join(root, 'outside-secret.txt'), OUTSIDE_SECRET)
  await writeFile(path.join(site, 'index.html'), SHELL)
  await writeFile(path.join(site, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
  await writeFile(path.join(site, 'evil.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
  await writeFile(path.join(site, 'notes.txt'), 'plain notes')
  // HTML bytes under an image name: the type must come from the name, so a browser is told it is an image.
  await writeFile(path.join(site, 'trick.png'), '<html><script>alert(1)</script></html>')
  await writeFile(path.join(site, '.env'), `API_KEY=${HIDDEN_SECRET}`)
  await mkdir(path.join(site, '.git'), { recursive: true })
  await writeFile(path.join(site, '.git', 'config'), HIDDEN_SECRET)
  await writeFile(path.join(site, 'assets', '.hidden.js'), HIDDEN_SECRET)
  await writeFile(path.join(site, 'assets', 'app.abc12345.js'), ASSET_BODY)
  await writeFile(path.join(site, 'assets', 'app.abc12345.js.br'), brotliCompressSync(Buffer.from(ASSET_BODY)))
  await writeFile(path.join(site, 'assets', 'app.abc12345.js.gz'), gzipSync(Buffer.from(ASSET_BODY)))
  await writeFile(path.join(site, 'assets', 'app.abc12345.js.map'), `{"secret":"${HIDDEN_SECRET}"}`)
  await writeFile(path.join(site, 'assets', 'style.abc12345.css'), 'body{margin:0}')
  return site
}

/** The real application on a random port, with in-memory stand-ins for everything outside it (there is nothing outside it). */
export async function startServer(options: StartOptions = {}): Promise<TestServer> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'roadsmith-test-'))
  const staticDirectory = await writeSite(root)
  const loaded = loadServerConfig({ NODE_ENV: 'test', TRUST_PROXY: 'loopback', ...options.env })
  const config: ServerConfig = { ...loaded, staticDirectory, ...options.config }
  const logs: string[] = []
  const app = createApp(config, { log: (line) => logs.push(line), ...options.deps })
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const stop = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    })
    await rm(root, { recursive: true, force: true })
  }
  return { url, config, logs, staticDirectory, stop }
}

let clientCounter = 0

export type Reply = { status: number; headers: Headers; text: string; json: Record<string, unknown> | null }

/** A client with its own address (through a trusted proxy header), so one test's requests never use up another's rate limit. */
export function newClient(baseUrl: string) {
  clientCounter += 1
  const address = `10.${Math.floor(clientCounter / 250)}.${clientCounter % 250}.9`
  return async (
    route: string,
    init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  ): Promise<Reply> => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: init.method ?? 'GET',
      redirect: 'manual',
      headers: { 'x-forwarded-for': address, ...init.headers },
      body: init.body,
    })
    const text = await response.text()
    let json: Record<string, unknown> | null = null
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      json = null
    }
    return { status: response.status, headers: response.headers, text, json }
  }
}

/** A request whose path is sent exactly as written. `fetch` would tidy `..` away before it left, hiding the attack. */
export function rawGet(baseUrl: string, rawPath: string, headers: Record<string, string> = {}): Promise<Reply> {
  const target = new URL(baseUrl)
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: target.hostname,
        port: target.port,
        path: rawPath,
        method: 'GET',
        headers: { 'x-forwarded-for': '10.250.250.1', ...headers },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          const headerMap = new Headers()
          for (const [key, value] of Object.entries(response.headers)) {
            if (typeof value === 'string') headerMap.set(key, value)
            else if (Array.isArray(value)) for (const item of value) headerMap.append(key, item)
          }
          let json: Record<string, unknown> | null = null
          try {
            json = JSON.parse(text) as Record<string, unknown>
          } catch {
            json = null
          }
          resolve({ status: response.statusCode ?? 0, headers: headerMap, text, json })
        })
      },
    )
    request.on('error', reject)
    request.end()
  })
}
