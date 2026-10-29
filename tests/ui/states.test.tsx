import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { parseCatalog } from '../../src/validators/catalog'
import { mountApp, realCatalogSource } from '../setup/ui'

const { setCatalogSource, resetCatalogCache } = await import('../../src/api')

after(() => resetCatalogCache())

const failures = ['/', '/diagnose', '/fix/flat-tire'] as const

test('a catalog that cannot load shows an announced error and a retry that really tries again', async () => {
  for (const address of failures) {
    let calls = 0
    setCatalogSource(async () => {
      calls += 1
      if (calls === 1) throw new Error('network down: C:\\secret\\path')
      return realCatalogSource()
    })
    const { screen, rtl } = await mountApp(address)
    await rtl.waitFor(() => assert.ok(screen.getByRole('alert')))
    const alert = screen.getByRole('alert')
    assert.match(document.body.textContent ?? '', /did not load/)
    assert.match(alert.textContent ?? '', /signal may be weak/)
    assert.ok(!/secret|network down/.test(document.body.textContent ?? ''), 'the error text must not leak into the page')
    rtl.fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await rtl.waitFor(() => assert.equal(screen.queryByRole('alert'), null))
    assert.equal(calls, 2, address)
    rtl.cleanup()
  }
})

test('offline is named as such', async () => {
  setCatalogSource(async () => {
    throw new Error('offline')
  })
  const { screen, rtl } = await mountApp('/')
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
  rtl.cleanup()
  const offline = await mountApp('/')
  await rtl.waitFor(() => assert.ok(offline.screen.getByRole('alert')))
  assert.match(offline.screen.getByRole('alert').textContent ?? '', /appear to be offline/)
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
  assert.ok(screen)
  offline.rtl.cleanup()
})

test('a catalog that loads but is the wrong shape is treated as a failure, not drawn', async () => {
  setCatalogSource(async () => parseCatalog({ categories: [], problems: 'nope', triage: [] }))
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByRole('alert')))
  assert.equal(screen.queryByRole('heading', { level: 2, name: 'Tires and wheels' }), null)
  rtl.cleanup()
})

test('a catalog already loaded is drawn at once on the next screen, with no second loading state', async () => {
  let calls = 0
  setCatalogSource(async () => {
    calls += 1
    return realCatalogSource()
  })
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  rtl.fireEvent.click(document.querySelector('a.row-link[href="/fix/flat-tire"]') as HTMLAnchorElement)
  assert.ok(await screen.findByRole('heading', { level: 1, name: 'Flat tire' }))
  assert.equal(screen.queryByText('Loading problems'), null, 'no loading state once the screen is drawn')
  assert.equal(calls, 1, 'the catalog was fetched once for both screens')
  rtl.cleanup()
})
