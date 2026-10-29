import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import {
  HIDDEN_SECRET,
  newClient,
  OUTSIDE_SECRET,
  rawGet,
  SHELL,
  startServer,
  type Reply,
  type TestServer,
} from '../setup/server.js'

let server: TestServer
let get: ReturnType<typeof newClient>

before(async () => {
  server = await startServer()
  get = newClient(server.url)
})
after(() => server.stop())

/** Nothing secret came back, and what did come back is either a refusal or the public shell. */
const assertNoLeak = (reply: Reply, label: string): void => {
  assert.ok(!reply.text.includes(OUTSIDE_SECRET), `${label} leaked a file from outside the web root`)
  assert.ok(!reply.text.includes(HIDDEN_SECRET), `${label} leaked a hidden file`)
  assert.ok([200, 400, 404].includes(reply.status), `${label} answered ${reply.status}`)
  if (reply.status === 200) assert.equal(reply.text, SHELL, `${label} answered 200 with something other than the shell`)
}

const TRAVERSAL = [
  '/../outside-secret.txt',
  '/../../outside-secret.txt',
  '/assets/../../outside-secret.txt',
  '/assets/../../../outside-secret.txt',
  '/%2e%2e/outside-secret.txt',
  '/%2e%2e%2foutside-secret.txt',
  '/..%2foutside-secret.txt',
  '/..%2f..%2foutside-secret.txt',
  '/assets/%2e%2e/%2e%2e/outside-secret.txt',
  '/..%5coutside-secret.txt',
  '/..%5c..%5coutside-secret.txt',
  '/%252e%252e/outside-secret.txt',
  '/%252e%252e%252foutside-secret.txt',
  '/..;/outside-secret.txt',
  '/assets/..%00/outside-secret.txt',
  '/./../outside-secret.txt',
  '//../outside-secret.txt',
  '/..%c0%afoutside-secret.txt',
  '/%2e%2e/%2e%2e/%2e%2e/%2e%2e/outside-secret.txt',
]

test('path traversal in every encoding never reaches a file outside the web root (SEC-17, SEC-34)', async () => {
  for (const attack of TRAVERSAL) assertNoLeak(await rawGet(server.url, attack), attack)
})

test('a path that is only `..`, ends in a slash, starts with two slashes or holds NUL is handled as a whole segment', async () => {
  for (const attack of [
    '/..',
    '/../',
    '/assets/..',
    '/assets/../',
    '/.',
    '/%00',
    '/index.html%00.png',
    '/assets/%00',
    '//',
    '///etc/passwd',
  ]) {
    assertNoLeak(await rawGet(server.url, attack), attack)
  }
})

test('hidden files and folders are never served, even when they exist inside the web root (SEC-15)', async () => {
  for (const attack of [
    '/.env',
    '/%2eenv',
    '/.git/config',
    '/.git',
    '/assets/.hidden.js',
    '/assets/%2ehidden.js',
    '/assets/.%68idden.js',
  ]) {
    const reply = await rawGet(server.url, attack)
    assertNoLeak(reply, attack)
    assert.notEqual(reply.headers.get('content-type')?.startsWith('application/javascript'), true, attack)
  }
})

test('a source map is never served, even when it exists in the web root (SEC-12)', async () => {
  const routes = [
    '/assets/app.abc12345.js.map',
    '/assets/app.abc12345.js.map?x=1',
    '/assets/APP.abc12345.js.MAP',
    '/assets/app.abc12345.js.Map',
    '/assets/app.abc12345.js%2Emap',
    '/assets/app.abc12345.js%2eMAP',
    '/assets/app.abc12345.js.map%20',
  ]
  for (const route of routes) {
    const reply = await rawGet(server.url, route)
    assert.equal(reply.status, 404, route)
    assert.ok(!reply.text.includes(HIDDEN_SECRET), route)
  }
})

test('private paths a deployment might expose are not reachable (SEC-15)', async () => {
  for (const route of [
    '/package.json',
    '/server/index.ts',
    '/node_modules/express/package.json',
    '/AGENTS.md',
    '/SECURITY.md',
    '/.env.example',
    '/pnpm-lock.yaml',
  ]) {
    const reply = await get(route)
    assert.ok(reply.text === SHELL || reply.status === 404, `${route} answered ${reply.status}`)
  }
})

test('only GET and HEAD are answered; every other method is refused with the allowed list (SEC-09)', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'PROPFIND']) {
    for (const route of ['/', '/api/health', '/fix/flat-tire', '/assets/app.abc12345.js']) {
      const reply = await get(route, {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'POST' || method === 'PUT' || method === 'PATCH' ? '{"x":1}' : undefined,
      })
      assert.equal(reply.status, 405, `${method} ${route}`)
      assert.equal(reply.headers.get('allow'), 'GET, HEAD', `${method} ${route}`)
      assert.equal(reply.json?.code, 'METHOD_NOT_ALLOWED', `${method} ${route}`)
    }
  }
})

test('a large or malformed body on a refused method is refused without being read (SEC-41)', async () => {
  const big = await get('/api/health', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'x'.repeat(5 * 1024 * 1024),
  })
  assert.equal(big.status, 405)
  const malformed = await get('/api/health', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"broken":',
  })
  assert.equal(malformed.status, 405)
  const wrongType = await get('/', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'plain' })
  assert.equal(wrongType.status, 405)
})

test('CORS is closed: no origin is allowed, a preflight is refused and no CORS header is ever sent (SEC-10, SEC-27)', async () => {
  const origins = ['https://evil.example', 'https://app.example.com.evil.example', 'null', 'http://localhost:4621']
  for (const origin of origins) {
    for (const reply of [
      await get('/api/health', { headers: { origin } }),
      await get('/', { headers: { origin } }),
      await get('/api/health', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'x-requested-with, content-type',
        },
      }),
    ]) {
      for (const [name] of reply.headers) assert.ok(!name.startsWith('access-control-'), `${origin} got ${name}`)
    }
  }
  const preflight = await get('/api/health', {
    method: 'OPTIONS',
    headers: { origin: 'https://evil.example', 'access-control-request-method': 'DELETE' },
  })
  assert.equal(preflight.status, 405)
})

test('the server never sets a cookie and ignores one it is sent (SEC-28)', async () => {
  const routes = ['/', '/api/health', '/fix/flat-tire', '/assets/app.abc12345.js', '/nope.js', '/api/nope']
  for (const route of routes) {
    const reply = await get(route, { headers: { cookie: 'session=forged; __Host-session=forged; theme=dark' } })
    assert.equal(reply.headers.get('set-cookie'), null, route)
  }
  const refused = await get('/', { method: 'POST', headers: { cookie: 'a=b' } })
  assert.equal(refused.headers.get('set-cookie'), null)
})

test('the type of a file comes from its name, never from its contents or anything stored (SEC-30)', async () => {
  const text = await get('/notes.txt')
  assert.match(text.headers.get('content-type') ?? '', /^text\/plain/)
  const trick = await get('/trick.png')
  assert.equal(trick.headers.get('content-type'), 'image/png', 'HTML bytes named .png must be announced as an image')
  assert.equal(trick.headers.get('x-content-type-options'), 'nosniff')
  const svg = await get('/evil.svg')
  assert.match(svg.headers.get('content-type') ?? '', /^image\/svg\+xml/)
  assert.equal(
    svg.headers.get('content-security-policy'),
    "default-src 'none'; sandbox",
    'an SVG runs in a sandbox with no script',
  )
  assert.equal(svg.headers.get('x-content-type-options'), 'nosniff')
})

test('no response reveals the framework, a version or a path (SEC-12, SEC-39)', async () => {
  for (const route of ['/', '/api/health', '/nope.js', '/api/nope', '/assets/app.abc12345.js']) {
    const reply = await get(route)
    assert.equal(reply.headers.get('x-powered-by'), null, route)
    assert.equal(reply.headers.get('server'), null, route)
    assert.ok(
      !/express|node\.js|roadsmith-test|E:\\|\/tmp\//i.test(reply.text.replace(/roadsmith/g, '')),
      `${route} body names its host`,
    )
  }
})

test('the health body has exactly three fields and names no bucket, backend, version or path (SEC-39)', async () => {
  const reply = await get('/api/health')
  assert.deepEqual(Object.keys(reply.json ?? {}).sort(), ['service', 'signInRequired', 'status'])
})
