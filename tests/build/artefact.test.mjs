// Checks the built output (run `pnpm build` first): the budgets, the files, what the bundle contains and how the compiled
// server behaves. A configuration file says what was asked; these tests read what was built (AGENTS.md TEST-17).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = path.join(root, 'dist')
const assets = path.join(dist, 'assets')

const BUDGET_BYTES = 250_000
const html = readFileSync(path.join(dist, 'index.html'), 'utf8')
const model = JSON.parse(readFileSync(path.join(root, 'src/content.model.json'), 'utf8'))

const assetPath = (url) => path.join(dist, url.replace(/^\//, ''))
const sizeOf = (url) => statSync(assetPath(url)).size
const allFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? allFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)],
  )

const entryScripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((match) => match[1])
const preloads = [...html.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"/g)].map((match) => match[1])
const initialScripts = [...entryScripts, ...preloads]

test('the first screen loads 250 KB of JavaScript or less before compression (PERF-02)', () => {
  assert.ok(entryScripts.length === 1, 'one entry script')
  const total = initialScripts.reduce((sum, url) => sum + sizeOf(url), 0)
  assert.ok(total <= BUDGET_BYTES, `initial scripts are ${total} bytes, over ${BUDGET_BYTES}`)
  process.stdout.write(`# initial JavaScript: ${total} bytes of ${BUDGET_BYTES} (${BUDGET_BYTES - total} to spare)\n`)
})

test('every script file is 250 KB or less, and every file under /assets carries a content hash (PERF-02, PERF-16)', () => {
  for (const file of allFiles(assets)) {
    const name = path.basename(file)
    assert.match(name, /\.[0-9a-f]{8}\.[a-z0-9]+(?:\.br|\.gz)?$/, `${name} has no content hash`)
    if (/\.js$/.test(name)) assert.ok(statSync(file).size <= BUDGET_BYTES, `${name} is over the chunk budget`)
  }
})

test('the problem catalog, the legal text and the Help copy are not in the first load (PERF-10)', () => {
  const initial = initialScripts.map((url) => readFileSync(assetPath(url), 'utf8')).join('\n')
  assert.ok(!initial.includes('Sidewall bulge or blowout'), 'the catalog is in the initial scripts')
  assert.ok(!initial.includes('What Roadsmith stores'), 'the legal text is in the initial scripts')
  assert.ok(!initial.includes('Make the car safe'), 'the Help copy is in the initial scripts')
  const lazy = readdirSync(assets).filter(
    (name) => /^(?:catalog|FixPage|HelpPage|LegalPage|DiagnosePanel)/.test(name) && name.endsWith('.js'),
  )
  assert.ok(lazy.length >= 5, `expected separate files for the catalog and the other screens, found ${lazy.join(', ')}`)
  // A search that finds nothing proves nothing (PRC-10): the same words must be found in the files that are loaded on demand.
  const everything = readdirSync(assets)
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(path.join(assets, name), 'utf8'))
    .join('\n')
  assert.ok(everything.includes('Make the car safe'), 'the Help copy is in no script at all, so the check above proves nothing')
})

test('the page is built from the content model, with deferred module scripts and no inline script or style (PERF-20)', () => {
  assert.match(html, new RegExp(`<html lang="${model.locale}">`))
  assert.ok(html.includes(`<title>${model.document.title}</title>`))
  assert.ok(html.includes(model.document.description))
  assert.ok(html.includes(model.document.noscript), 'the no-script message must be in the page')
  assert.ok(!/%[A-Z_]+%/.test(html), 'a placeholder was left in the page')
  assert.match(html, /<script type="module" crossorigin src="\/assets\/index\.[0-9a-f]{8}\.js">/)
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html), 'an inline script is present')
  assert.ok(!/<style[\s>]/.test(html), 'an inline style block is present')
  assert.ok(!/\sstyle="/.test(html), 'an inline style attribute is present')
  assert.match(html, /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"/, 'CSS is real files, not injected by script')
})

test('the first-screen font is preloaded and fonts are self-hosted, with no third-party request (PERF-25, SEC-01)', () => {
  assert.match(
    html,
    /<link\s+rel="preload"\s+as="font"\s+type="font\/woff2"\s+crossorigin\s+href="\/assets\/archivo-latin-wdth-normal\.[0-9a-f]{8}\.woff2"/,
  )
  const origins = new Set()
  for (const file of [path.join(dist, 'index.html'), ...allFiles(assets).filter((name) => /\.(js|css)$/.test(name))]) {
    for (const match of readFileSync(file, 'utf8').matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) origins.add(match[1])
  }
  // XML namespace names (never fetched), React's error-message address (text only) and the two search pages the app links to.
  const allowed = new Set(['www.w3.org', 'react.dev', 'www.youtube.com', 'www.google.com'])
  const unexpected = [...origins].filter((origin) => !allowed.has(origin))
  assert.deepEqual(unexpected, [], 'the bundle names an origin it should not')
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html))
})

test('no source map is built or referenced (SEC-12)', () => {
  assert.deepEqual(
    allFiles(dist).filter((file) => /\.map$/.test(file)),
    [],
  )
  for (const file of allFiles(assets).filter((name) => name.endsWith('.js'))) {
    assert.ok(!readFileSync(file, 'utf8').includes('sourceMappingURL'), `${path.basename(file)} points at a source map`)
  }
})

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /sk-[A-Za-z0-9]{24,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  /AIza[0-9A-Za-z_-]{35}/,
]
const NAMES =
  /\b(?:process\.env|import\.meta\.env|VITE_[A-Z_]+|API_KEY|SERVICE_ROLE|SECRET_KEY|PRIVATE_KEY|PUBLIC_ORIGIN|TRUST_PROXY)\b/

test('the secret scan finds a planted sample of each pattern, so a clean result means something (PRC-10)', () => {
  const samples = [
    `AKIA${'A'.repeat(16)}`,
    `sk-${'a'.repeat(24)}`,
    `ghp_${'a'.repeat(30)}`,
    `xoxb-${'a'.repeat(12)}`,
    `-----BEGIN ${'PRIVATE'} KEY-----`,
    `eyJ${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(10)}`,
    `AIza${'a'.repeat(35)}`,
  ]
  SECRET_PATTERNS.forEach((pattern, index) => assert.match(samples[index], pattern, `pattern ${index}`))
  assert.match('const k = process.env.API_KEY', NAMES)
  assert.match('x = import.meta.env.VITE_TOKEN', NAMES)
})

test('the built client holds no secret, key name or environment read (SEC-01)', () => {
  for (const file of allFiles(dist).filter((name) => /\.(js|css|html|svg)$/.test(name))) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of SECRET_PATTERNS) assert.ok(!pattern.test(text), `${path.basename(file)} matches ${pattern}`)
    assert.ok(!NAMES.test(text), `${path.basename(file)} names a server setting or reads the environment`)
  }
})

test('every compressible file has brotli and gzip twins that decompress to the original (PERF-17)', () => {
  const compressible = allFiles(dist).filter((file) => /\.(js|css|html|svg|json)$/.test(file) && statSync(file).size >= 512)
  assert.ok(compressible.length >= 6)
  for (const file of compressible) {
    const original = readFileSync(file)
    assert.deepEqual(brotliDecompressSync(readFileSync(`${file}.br`)), original, `${path.basename(file)}.br`)
    assert.deepEqual(gunzipSync(readFileSync(`${file}.gz`)), original, `${path.basename(file)}.gz`)
  }
})

test('the compiled server exists and carries no source map or test code', () => {
  const files = allFiles(path.join(root, 'dist-server'))
  assert.ok(files.some((file) => file.endsWith(`${path.sep}index.js`)))
  assert.deepEqual(
    files.filter((file) => /\.map$|\.test\./.test(file)),
    [],
  )
})

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

/** Runs the compiled server and resolves with a handle once it says it is listening, or its exit once it stops. */
function runBuiltServer(env) {
  const child = spawn(process.execPath, [path.join(root, 'dist-server', 'index.js')], {
    cwd: root,
    env: { PATH: process.env.PATH, ...env },
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => (stdout += chunk))
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const exited = new Promise((resolve) => child.once('exit', (code) => resolve(code)))
  const listening = new Promise((resolve) => {
    const check = setInterval(() => {
      if (stdout.includes('listening')) {
        clearInterval(check)
        resolve(true)
      }
    }, 20)
    exited.then(() => {
      clearInterval(check)
      resolve(false)
    })
  })
  return { child, exited, listening, output: () => ({ stdout, stderr }) }
}

test('the compiled server serves the built client with the security headers, and stops on a signal (TEST-17, SEC-11)', async () => {
  const port = await freePort()
  const run = runBuiltServer({ PORT: String(port), NODE_ENV: 'development' })
  try {
    assert.equal(await run.listening, true, run.output().stderr)
    const base = `http://127.0.0.1:${port}`
    const health = await fetch(`${base}/api/health`)
    assert.deepEqual(await health.json(), { status: 'ok', service: 'roadsmith', signInRequired: false })
    const shell = await fetch(base, { headers: { 'accept-encoding': 'br' } })
    assert.equal(shell.status, 200)
    assert.equal(shell.headers.get('content-encoding'), 'br')
    assert.equal(shell.headers.get('cache-control'), 'no-cache')
    assert.equal(shell.headers.get('x-content-type-options'), 'nosniff')
    const policy = shell.headers.get('content-security-policy') ?? ''
    assert.ok(policy.includes("script-src 'self'") && !policy.includes('unsafe-'))
    const entry = entryScripts[0]
    const script = await fetch(`${base}${entry}`, { headers: { 'accept-encoding': 'br' } })
    assert.equal(script.headers.get('cache-control'), 'public, max-age=31536000, immutable')
    assert.match(script.headers.get('content-type') ?? '', /javascript/)
    assert.equal(script.headers.get('content-encoding'), 'br')
    const map = await fetch(`${base}${entry}.map`)
    assert.equal(map.status, 404)
  } finally {
    run.child.kill('SIGTERM')
  }
  const code = await Promise.race([run.exited, new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000))])
  assert.notEqual(code, 'timeout', 'the server did not stop on SIGTERM')
})

test('the compiled server refuses to start in production without its settings, and says which (SEC-23)', async () => {
  const port = await freePort()
  const cases = [
    [{ NODE_ENV: 'production', PORT: String(port), TRUST_PROXY: 'loopback' }, /PUBLIC_ORIGIN is required/],
    [{ NODE_ENV: 'production', PORT: String(port) }, /TRUST_PROXY is required/],
    [
      { NODE_ENV: 'production', PORT: String(port), PUBLIC_ORIGIN: 'http://insecure.example.com', TRUST_PROXY: 'loopback' },
      /must use https/,
    ],
    [{ NODE_ENV: 'production', PORT: String(port), PUBLIC_ORIGIN: 'https://app.example.com' }, /TRUST_PROXY is required/],
  ]
  for (const [env, message] of cases) {
    const run = runBuiltServer(env)
    const code = await Promise.race([run.exited, new Promise((resolve) => setTimeout(() => resolve('timeout'), 8000))])
    if (code === 'timeout') run.child.kill('SIGKILL')
    assert.notEqual(code, 'timeout', 'the server kept running')
    assert.notEqual(code, 0)
    assert.equal(await run.listening, false)
    assert.match(run.output().stderr, message)
    assert.ok(!run.output().stderr.includes('insecure.example.com'), 'a setting value was printed')
  }
})
