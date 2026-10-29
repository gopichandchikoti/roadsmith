import assert from 'node:assert/strict'
import test from 'node:test'
import { loadServerConfig } from '../../server/config/index.js'

const production = { NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://app.example.com', TRUST_PROXY: 'loopback' }

const refuses = (env: Record<string, string>, pattern: RegExp) => assert.throws(() => loadServerConfig(env), pattern)

test('production starts with a public https origin and a named proxy', () => {
  const config = loadServerConfig(production)
  assert.equal(config.production, true)
  assert.equal(config.publicOrigin, 'https://app.example.com')
  assert.deepEqual(config.trustProxy, ['loopback'])
  assert.equal(config.host, '0.0.0.0')
  assert.equal(config.port, 4620)
})

test('production refuses to start without a public origin (SEC-23)', () => {
  refuses({ NODE_ENV: 'production', TRUST_PROXY: 'loopback' }, /PUBLIC_ORIGIN is required/)
  refuses({ ...production, PUBLIC_ORIGIN: '' }, /PUBLIC_ORIGIN is required/)
})

test('production refuses an origin that is not plain https (SEC-23)', () => {
  const bad = [
    'http://app.example.com',
    'https://app.example.com/path',
    'https://app.example.com/?x=1',
    'https://app.example.com#frag',
    'app.example.com',
    'ftp://app.example.com',
    'https://user:pass@app.example.com',
    'not a url',
    '//app.example.com',
  ]
  for (const origin of bad) refuses({ ...production, PUBLIC_ORIGIN: origin }, /PUBLIC_ORIGIN/)
})

test('production refuses to start without a trusted proxy, or with a hop count (SEC-29)', () => {
  refuses({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://app.example.com' }, /TRUST_PROXY is required/)
  refuses({ ...production, TRUST_PROXY: '0' }, /TRUST_PROXY is required/)
  for (const hops of ['1', '2', 'true', 'yes', '10.0.0.1/99', 'not-an-address', '10.0.0.1, abc', '::1/200']) {
    refuses({ ...production, TRUST_PROXY: hops }, /TRUST_PROXY/)
  }
})

test('a list of proxy addresses is accepted, with spaces and CIDR ranges', () => {
  const config = loadServerConfig({ ...production, TRUST_PROXY: '10.0.0.0/8, 192.168.1.5, ::1, loopback' })
  assert.deepEqual(config.trustProxy, ['10.0.0.0/8', '192.168.1.5', '::1', 'loopback'])
})

test('development needs nothing, binds to the local machine and has no origin or proxy', () => {
  const config = loadServerConfig({})
  assert.equal(config.production, false)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.publicOrigin, null)
  assert.equal(config.trustProxy, null)
})

test('a bad origin or proxy is refused outside production too, so a typo is found early', () => {
  refuses({ PUBLIC_ORIGIN: 'https://app.example.com/path' }, /PUBLIC_ORIGIN/)
  refuses({ TRUST_PROXY: '3' }, /TRUST_PROXY/)
})

test('the port must be a whole number from 1 to 65535', () => {
  for (const port of ['0', '65536', '-1', '1.5', 'abc', '80 ', ' 80', '1e3', '0x50', '080808', '+80'])
    refuses({ PORT: port }, /PORT must be/)
  assert.equal(loadServerConfig({ PORT: '8080' }).port, 8080)
  assert.equal(loadServerConfig({ PORT: '' }).port, 4620)
})

test('a start-up error names the setting and never prints its value (SEC-25)', () => {
  const secretish = 'http://very-private-host.internal:9999/admin?token=abc123'
  try {
    loadServerConfig({ ...production, PUBLIC_ORIGIN: secretish })
    assert.fail('should have thrown')
  } catch (error) {
    assert.ok(error instanceof Error)
    assert.ok(!error.message.includes('very-private-host'))
    assert.ok(!error.message.includes('abc123'))
  }
  try {
    loadServerConfig({ ...production, TRUST_PROXY: '203.0.113.77/99' })
    assert.fail('should have thrown')
  } catch (error) {
    assert.ok(error instanceof Error)
    assert.ok(!error.message.includes('203.0.113.77'))
  }
})

test('the app asks for no secret: a settings file with only names is a complete one', () => {
  const config = loadServerConfig({ ...production })
  assert.deepEqual(Object.keys(config).sort(), [
    'host',
    'port',
    'production',
    'publicOrigin',
    'rateLimit',
    'staticDirectory',
    'trustProxy',
  ])
})
