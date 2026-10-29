import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { ASSET_BODY, newClient, rawGet, SHELL, startServer, type TestServer } from '../setup/server.js'

let server: TestServer
let get: ReturnType<typeof newClient>

before(async () => {
  server = await startServer()
  get = newClient(server.url)
})
after(() => server.stop())

test('the health probe answers with exactly the documented body and nothing about the host', async () => {
  const reply = await get('/api/health')
  assert.equal(reply.status, 200)
  assert.deepEqual(reply.json, { status: 'ok', service: 'roadsmith', signInRequired: false })
  assert.match(reply.headers.get('content-type') ?? '', /^application\/json/)
  assert.equal(reply.headers.get('cache-control'), 'no-store')
})

test('the HTML shell is served for the home page and revalidated every time', async () => {
  const reply = await get('/')
  assert.equal(reply.status, 200)
  assert.equal(reply.text, SHELL)
  assert.match(reply.headers.get('content-type') ?? '', /^text\/html/)
  assert.equal(reply.headers.get('cache-control'), 'no-cache')
})

test('a screen of the app that is not a file gets the shell, so a shared link or a refresh works', async () => {
  for (const route of ['/fix/flat-tire', '/diagnose/noise/2', '/privacy', '/terms', '/anything/at/all']) {
    const reply = await get(route)
    assert.equal(reply.status, 200, route)
    assert.equal(reply.text, SHELL, route)
  }
})

test('a hashed asset is kept for a year and never revalidated', async () => {
  const reply = await get('/assets/app.abc12345.js', { headers: { 'accept-encoding': 'identity' } })
  assert.equal(reply.status, 200)
  assert.equal(reply.text, ASSET_BODY)
  assert.equal(reply.headers.get('cache-control'), 'public, max-age=31536000, immutable')
  assert.match(reply.headers.get('content-type') ?? '', /javascript/)
})

test('a brotli or gzip twin is sent when the browser accepts it, with the right type and Vary', async () => {
  const brotli = await get('/assets/app.abc12345.js', { headers: { 'accept-encoding': 'br, gzip' } })
  assert.equal(brotli.headers.get('content-encoding'), 'br')
  assert.equal(brotli.text, ASSET_BODY)
  assert.match(brotli.headers.get('content-type') ?? '', /javascript/)
  assert.match(brotli.headers.get('vary') ?? '', /Accept-Encoding/i)
  const gzip = await get('/assets/app.abc12345.js', { headers: { 'accept-encoding': 'gzip' } })
  assert.equal(gzip.headers.get('content-encoding'), 'gzip')
  assert.equal(gzip.text, ASSET_BODY)
  const plain = await get('/assets/app.abc12345.js', { headers: { 'accept-encoding': 'identity' } })
  assert.equal(plain.headers.get('content-encoding'), null)
})

test('a file the browser already has answers 304 when its tag still matches', async () => {
  // A raw request: `fetch` adds Cache-Control: no-cache when it is given If-None-Match, which a revalidating browser does not.
  const first = await rawGet(server.url, '/assets/style.abc12345.css', { 'accept-encoding': 'identity' })
  const tag = first.headers.get('etag')
  assert.ok(tag, 'a static file carries an ETag')
  const again = await rawGet(server.url, '/assets/style.abc12345.css', { 'accept-encoding': 'identity', 'if-none-match': tag })
  assert.equal(again.status, 304)
  assert.equal(again.text, '')
  const changed = await rawGet(server.url, '/assets/style.abc12345.css', {
    'accept-encoding': 'identity',
    'if-none-match': '"something-else"',
  })
  assert.equal(changed.status, 200)
})

test('HEAD answers like GET without a body', async () => {
  const reply = await get('/', { method: 'HEAD' })
  assert.equal(reply.status, 200)
  assert.equal(reply.text, '')
  assert.match(reply.headers.get('content-type') ?? '', /^text\/html/)
})

test('a missing file answers 404 with the one error body, a request id and no path', async () => {
  const reply = await get('/assets/missing.abc12345.js')
  assert.equal(reply.status, 404)
  assert.deepEqual(Object.keys(reply.json ?? {}).sort(), ['code', 'message', 'requestId'])
  assert.equal(reply.json?.code, 'NOT_FOUND')
  assert.equal(reply.json?.requestId, reply.headers.get('x-request-id'))
  assert.ok(!reply.text.includes('missing.abc12345'), 'the body must not echo the path')
})

test('an unknown API address answers JSON 404, never the app shell', async () => {
  for (const route of ['/api', '/api/', '/api/nope', '/api/health/extra', '/api/v1/anything']) {
    const reply = await get(route)
    assert.equal(reply.status, 404, route)
    assert.equal(reply.json?.code, 'NOT_FOUND', route)
    assert.equal(reply.headers.get('cache-control'), 'no-store', route)
  }
})

test('every response carries a request id; a sensible one sent by the caller is kept, a hostile one is replaced', async () => {
  const generated = await get('/api/health')
  assert.match(generated.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/)
  const kept = await get('/api/health', { headers: { 'x-request-id': 'trace-12345678' } })
  assert.equal(kept.headers.get('x-request-id'), 'trace-12345678')
  for (const hostile of ['a', 'x'.repeat(200), 'has space in it', 'line\\nbreak-value', '<script>alert(1)</script>']) {
    const replaced = await get('/api/health', { headers: { 'x-request-id': hostile } })
    assert.notEqual(replaced.headers.get('x-request-id'), hostile)
    assert.match(replaced.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/)
  }
})

test('the server writes nothing to its log for ordinary requests, including a missing page', async () => {
  const logged = server.logs.length
  await get('/')
  await get('/api/health')
  await get('/nope.js')
  assert.equal(server.logs.length, logged)
})
