import assert from 'node:assert/strict'
import test from 'node:test'
import express from 'express'
import type { AddressInfo } from 'node:net'
import { createErrorHandler, requestId } from '../../server/middlewares/request-context.js'

const SECRET_PATH = 'C:\\Users\\owner\\secret-folder\\roadsmith.sqlite'
const SECRET_KEY = 'sk-live-0123456789abcdef0123456789abcdef'

/** The real request-id and error middleware around routes that fail in the ways a real server fails. */
async function withFailingRoutes<T>(run: (url: string, lines: string[]) => Promise<T>): Promise<T> {
  const lines: string[] = []
  const app = express()
  app.use(requestId)
  app.get('/disk-full', () => {
    throw Object.assign(new Error(`ENOSPC: no space left on device, write '${SECRET_PATH}'`), { code: 'ENOSPC' })
  })
  app.get('/provider', () => {
    throw new Error(`upstream said: invalid key ${SECRET_KEY}`)
  })
  app.get('/sql', () => {
    throw new Error('SELECT * FROM users WHERE name = \'x\' failed near "DROP"')
  })
  app.get('/missing', () => {
    throw Object.assign(new Error(`ENOENT ${SECRET_PATH}`), { status: 404 })
  })
  // Something that is not an Error at all, such as a rejected string, must be handled as carefully as an Error.
  app.get('/non-error', () => Promise.reject(`a rejected string with ${SECRET_KEY}`))
  app.get('/async', async () => {
    throw new Error(`async failure at ${SECRET_PATH}`)
  })
  app.use(createErrorHandler((line) => lines.push(line)))
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  try {
    return await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, lines)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

test('a failing disk answers 500 with a code and a request id and no path (SEC-37)', async () => {
  await withFailingRoutes(async (url, lines) => {
    const response = await fetch(`${url}/disk-full`)
    const text = await response.text()
    const body = JSON.parse(text) as Record<string, unknown>
    assert.equal(response.status, 500)
    assert.equal(body.code, 'INTERNAL_ERROR')
    assert.equal(body.requestId, response.headers.get('x-request-id'))
    assert.ok(!text.includes('secret-folder') && !text.includes('ENOSPC') && !text.includes('sqlite'), text)
    assert.equal(lines.length, 1)
  })
})

test('a provider error that holds a key leaves it out of the reply and out of the log (SEC-25, SEC-38)', async () => {
  await withFailingRoutes(async (url, lines) => {
    for (const route of ['/provider', '/non-error', '/async', '/sql']) {
      const response = await fetch(`${url}${route}`)
      const text = await response.text()
      assert.equal(response.status, 500, route)
      assert.ok(!text.includes('sk-live') && !text.includes('secret-folder') && !text.includes('DROP'), `${route}: ${text}`)
    }
    const log = lines.join('\n')
    assert.ok(!log.includes('sk-live'), 'the key reached the log')
    assert.ok(!log.includes('secret-folder'), 'a path reached the log')
    assert.ok(!log.includes('DROP'), 'SQL reached the log')
    assert.ok(!/invalid key|upstream said/.test(log), 'an error message reached the log')
  })
})

test('a server fault is logged with the request id, method, path and the error name and code only', async () => {
  await withFailingRoutes(async (url, lines) => {
    const response = await fetch(`${url}/disk-full`)
    const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>
    assert.deepEqual(Object.keys(entry).sort(), ['code', 'level', 'method', 'name', 'path', 'requestId'])
    assert.equal(entry.requestId, response.headers.get('x-request-id'))
    assert.equal(entry.code, 'ENOSPC')
    assert.equal(entry.name, 'Error')
    assert.equal(entry.path, '/disk-full')
  })
})

test('a missing file is a 404 with a fixed message, and is not logged as a fault', async () => {
  await withFailingRoutes(async (url, lines) => {
    const response = await fetch(`${url}/missing`)
    const text = await response.text()
    assert.equal(response.status, 404)
    assert.equal((JSON.parse(text) as Record<string, unknown>).code, 'NOT_FOUND')
    assert.ok(!text.includes('secret-folder'))
    assert.equal(lines.length, 0)
  })
})

test('the stack of an error never appears in any reply (SEC-12)', async () => {
  await withFailingRoutes(async (url) => {
    for (const route of ['/disk-full', '/provider', '/sql', '/async']) {
      const text = await (await fetch(`${url}${route}`)).text()
      assert.ok(!/\bat\s+\S+\s+\(|node_modules|\.ts:\d+/.test(text), `${route} shows a stack`)
    }
  })
})
