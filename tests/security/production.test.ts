import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { SHELL, startServer, type TestServer } from '../setup/server.js'

const PRODUCTION = { NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://app.example.com', TRUST_PROXY: 'loopback' }

let server: TestServer
before(async () => {
  server = await startServer({ env: PRODUCTION })
})
after(() => server.stop())

const request = (route: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  fetch(`${server.url}${route}`, {
    redirect: 'manual',
    method: init.method,
    headers: { 'x-forwarded-for': '10.9.9.9', ...init.headers },
  })

test('a plain http read is sent to the configured https origin, with the path kept (SEC-11)', async () => {
  const reply = await request('/fix/flat-tire?x=1')
  assert.equal(reply.status, 308)
  assert.equal(reply.headers.get('location'), 'https://app.example.com/fix/flat-tire?x=1')
  assert.equal(reply.headers.get('strict-transport-security'), 'max-age=31536000')
})

test('a forged Host header cannot steer the redirect to another site', async () => {
  for (const host of ['evil.example', 'evil.example:8080', 'app.example.com.evil.example']) {
    const reply = await request('/', { headers: { host } })
    assert.equal(reply.headers.get('location'), 'https://app.example.com/', host)
  }
  const forwarded = await request('/', { headers: { 'x-forwarded-host': 'evil.example' } })
  assert.equal(forwarded.headers.get('location'), 'https://app.example.com/')
})

test('a plain http write is refused rather than redirected, with the one error body', async () => {
  for (const route of ['/', '/fix/flat-tire', '/assets/app.abc12345.js']) {
    const reply = await request(route, { method: 'POST' })
    assert.equal(reply.status, 426, route)
    const body = (await reply.json()) as Record<string, unknown>
    assert.equal(body.code, 'HTTPS_REQUIRED', route)
    assert.equal(reply.headers.get('location'), null, route)
  }
})

test('the health probe answers over plain http, so a platform probe works', async () => {
  const reply = await request('/api/health')
  assert.equal(reply.status, 200)
})

test('a request that arrived over https through the trusted proxy is served', async () => {
  const reply = await request('/', { headers: { 'x-forwarded-proto': 'https' } })
  assert.equal(reply.status, 200)
  assert.equal(await reply.text(), SHELL)
  assert.equal(reply.headers.get('strict-transport-security'), 'max-age=31536000')
})

test('a client cannot claim https when the proxy that sent the header is not trusted (SEC-29)', async () => {
  const untrusted = await startServer({ env: { ...PRODUCTION, TRUST_PROXY: '10.0.0.0/8' } })
  try {
    const reply = await fetch(`${untrusted.url}/`, {
      redirect: 'manual',
      headers: { 'x-forwarded-proto': 'https', 'x-forwarded-for': '203.0.113.5' },
    })
    assert.equal(reply.status, 308)
    assert.equal(reply.headers.get('location'), 'https://app.example.com/')
  } finally {
    await untrusted.stop()
  }
})
