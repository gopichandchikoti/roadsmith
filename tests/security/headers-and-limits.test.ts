import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { newClient, startServer, type Reply, type TestServer } from '../setup/server.js'

let server: TestServer
let get: ReturnType<typeof newClient>

before(async () => {
  server = await startServer()
  get = newClient(server.url)
})
after(() => server.stop())

const REQUIRED = [
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
]

function assertHardened(reply: Reply, label: string): void {
  for (const header of REQUIRED) assert.ok(reply.headers.get(header), `${label} lacks ${header}`)
  assert.equal(reply.headers.get('x-content-type-options'), 'nosniff', label)
  assert.equal(reply.headers.get('x-frame-options'), 'DENY', label)
  assert.equal(reply.headers.get('referrer-policy'), 'no-referrer', label)
  assert.equal(reply.headers.get('cross-origin-opener-policy'), 'same-origin', label)
  assert.equal(reply.headers.get('cross-origin-resource-policy'), 'same-origin', label)
}

test('every kind of response carries the security headers (SEC-11)', async () => {
  const replies: [string, Reply][] = [
    ['shell', await get('/')],
    ['screen', await get('/fix/flat-tire')],
    ['asset', await get('/assets/app.abc12345.js')],
    ['text file', await get('/notes.txt')],
    ['health', await get('/api/health')],
    ['missing file', await get('/nope.js')],
    ['unknown api', await get('/api/nope')],
    ['refused method', await get('/', { method: 'POST' })],
    ['source map', await get('/assets/app.abc12345.js.map')],
  ]
  for (const [label, reply] of replies) assertHardened(reply, label)
})

test('the content security policy has no unsafe-eval, no unsafe-inline, no wildcard and no other origin (SEC-11)', async () => {
  const policy = (await get('/')).headers.get('content-security-policy') ?? ''
  assert.ok(!/unsafe-eval|unsafe-inline|\*|data:|blob:|https?:/.test(policy), policy)
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ]) {
    assert.ok(policy.includes(directive), `missing ${directive}`)
  }
})

test('powerful browser features are switched off by the permissions policy', async () => {
  const policy = (await get('/')).headers.get('permissions-policy') ?? ''
  for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb'])
    assert.ok(policy.includes(`${feature}=()`), feature)
})

test('production adds HSTS for a year; development does not', async () => {
  const dev = await get('/')
  assert.equal(dev.headers.get('strict-transport-security'), null)
  const prod = await startServer({
    env: { NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://app.example.com', TRUST_PROXY: 'loopback' },
  })
  try {
    const reply = await newClient(prod.url)('/api/health', { headers: { 'x-forwarded-proto': 'https' } })
    assert.equal(reply.headers.get('strict-transport-security'), 'max-age=31536000')
    assertHardened(reply, 'production health')
  } finally {
    await prod.stop()
  }
})

test('a client that goes over its budget is refused with 429, Retry-After and the one error body (SEC-08, SEC-40)', async () => {
  const small = await startServer({ config: { rateLimit: { windowMs: 60_000, limit: 3 } } })
  try {
    const client = newClient(small.url)
    for (let index = 0; index < 3; index += 1) assert.equal((await client('/api/health')).status, 200)
    const refused = await client('/api/health')
    assert.equal(refused.status, 429)
    assert.equal(refused.json?.code, 'RATE_LIMITED')
    assert.equal(refused.json?.requestId, refused.headers.get('x-request-id'))
    assert.match(refused.headers.get('retry-after') ?? '', /^\d+$/)
    assert.equal(refused.headers.get('ratelimit-limit'), '3')
    assert.equal(refused.headers.get('ratelimit-remaining'), '0')
    assertHardened(refused, '429')
    for (const route of ['/', '/assets/app.abc12345.js', '/nope']) assert.equal((await client(route)).status, 429, route)
  } finally {
    await small.stop()
  }
})

test('the limit counts every client separately behind a trusted proxy (SEC-29)', async () => {
  const small = await startServer({ config: { rateLimit: { windowMs: 60_000, limit: 2 } } })
  try {
    const first = newClient(small.url)
    const second = newClient(small.url)
    await first('/api/health')
    await first('/api/health')
    assert.equal((await first('/api/health')).status, 429)
    assert.equal((await second('/api/health')).status, 200, 'a second visitor must have their own budget')
  } finally {
    await small.stop()
  }
})

test('a client cannot dodge the limit by inventing forwarding headers when no proxy is trusted (SEC-29)', async () => {
  const small = await startServer({ env: { TRUST_PROXY: '' }, config: { rateLimit: { windowMs: 60_000, limit: 2 } } })
  try {
    const statuses: number[] = []
    for (let index = 0; index < 5; index += 1) {
      const reply = await fetch(`${small.url}/api/health`, { headers: { 'x-forwarded-for': `203.0.113.${index}` } })
      statuses.push(reply.status)
    }
    assert.deepEqual(statuses, [200, 200, 429, 429, 429])
  } finally {
    await small.stop()
  }
})

test('a client cannot dodge the limit by forging the header when the proxy trusted is another machine (SEC-29)', async () => {
  const small = await startServer({ env: { TRUST_PROXY: '10.0.0.0/8' }, config: { rateLimit: { windowMs: 60_000, limit: 2 } } })
  try {
    const statuses: number[] = []
    for (let index = 0; index < 4; index += 1) {
      const reply = await fetch(`${small.url}/api/health`, { headers: { 'x-forwarded-for': `203.0.113.${index}` } })
      statuses.push(reply.status)
    }
    assert.deepEqual(statuses, [200, 200, 429, 429])
  } finally {
    await small.stop()
  }
})

test('the window resets when time passes, proved with an injected clock and no waiting (TEST-16)', async () => {
  let now = 1_000_000
  const small = await startServer({ config: { rateLimit: { windowMs: 60_000, limit: 1 } }, deps: { now: () => now } })
  try {
    const client = newClient(small.url)
    assert.equal((await client('/api/health')).status, 200)
    assert.equal((await client('/api/health')).status, 429)
    now += 59_000
    assert.equal((await client('/api/health')).status, 429)
    now += 2_000
    assert.equal((await client('/api/health')).status, 200)
  } finally {
    await small.stop()
  }
})

test('the limiter remembers a bounded number of clients and drops the oldest first (SEC-08)', async () => {
  const small = await startServer({ config: { rateLimit: { windowMs: 60_000, limit: 1, capacity: 2 } } })
  try {
    const [a, b, c] = [newClient(small.url), newClient(small.url), newClient(small.url)]
    assert.equal((await a('/api/health')).status, 200)
    assert.equal((await a('/api/health')).status, 429)
    assert.equal((await b('/api/health')).status, 200)
    assert.equal((await c('/api/health')).status, 200)
    assert.equal((await a('/api/health')).status, 200, 'the oldest client was forgotten to keep memory bounded')
    assert.equal((await c('/api/health')).status, 429, 'a client still remembered keeps its count')
  } finally {
    await small.stop()
  }
})
