import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mountApp, realCatalogSource } from '../setup/ui'

const { setCatalogSource, resetCatalogCache } = await import('../../src/api')

beforeEach(() => setCatalogSource(realCatalogSource))
after(() => resetCatalogCache())

const ROUTES = [
  '/',
  '/diagnose',
  '/diagnose/noise',
  '/diagnose/noise/0',
  '/fix/flat-tire',
  '/help',
  '/privacy',
  '/terms',
  '/nowhere',
] as const

test('every screen has one main landmark, one h1, a skip link first and the footer links', async () => {
  for (const address of ROUTES) {
    const { screen, rtl } = await mountApp(address)
    await rtl.waitFor(() => assert.equal(document.querySelectorAll('h1').length, 1), { timeout: 2000 })
    assert.equal(screen.getAllByRole('main').length, 1, address)
    const skip = document.querySelector('a.skip-link')
    assert.equal(skip?.getAttribute('href'), '#main', address)
    assert.equal(
      document.querySelector('a, button, input, select')?.className,
      'skip-link',
      `${address}: the skip link is not first`,
    )
    assert.equal(document.getElementById('main')?.tagName, 'MAIN')
    assert.equal(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href'), '/privacy')
    assert.equal(screen.getByRole('link', { name: 'Terms' }).getAttribute('href'), '/terms')
    rtl.cleanup()
  }
})

test('the Privacy and Terms pages show every section of their text', async () => {
  const { screen, rtl } = await mountApp('/privacy')
  assert.ok(await screen.findByRole('heading', { level: 1, name: 'Privacy' }))
  assert.ok(screen.getByRole('heading', { level: 2, name: 'What Roadsmith stores' }))
  assert.ok(screen.getByText(/29 October 2026/))
  assert.ok(screen.getByRole('heading', { level: 2, name: 'The summary on the Help page' }))
  assert.equal(document.title, 'Privacy | Roadsmith')
  rtl.cleanup()
  const terms = await mountApp('/terms')
  assert.ok(await terms.screen.findByRole('heading', { level: 1, name: 'Terms' }))
  assert.ok(terms.screen.getByRole('heading', { level: 2, name: 'Safety comes first' }))
  terms.rtl.cleanup()
})

test('an unknown address shows the not-found screen with a way back', async () => {
  const { screen, rtl } = await mountApp('/no/such/place')
  assert.ok(await screen.findByRole('heading', { level: 1, name: 'Page not found' }))
  assert.equal(screen.getByRole('link', { name: 'Go to the problem list' }).getAttribute('href'), '/')
  assert.equal(document.title, 'Page not found | Roadsmith')
  rtl.cleanup()
})

test('following a link moves focus to the new heading, and the first screen does not steal focus', async () => {
  const { screen, rtl } = await mountApp('/')
  assert.notEqual(document.activeElement?.tagName, 'H1')
  rtl.fireEvent.click(screen.getByRole('link', { name: 'Privacy' }))
  await rtl.waitFor(() => assert.equal(document.activeElement?.tagName, 'H1'))
  assert.equal(document.activeElement?.textContent, 'Privacy')
  assert.equal(window.location.pathname, '/privacy')
  rtl.cleanup()
})

test('a link with a modifier key is left to the browser instead of being handled by the router', async () => {
  const { screen, rtl } = await mountApp('/')
  rtl.fireEvent.click(screen.getByRole('link', { name: 'Privacy' }), { ctrlKey: true })
  assert.equal(window.location.pathname, '/')
  rtl.cleanup()
})

test('the theme control is a radio group that sets the theme and remembers it', async () => {
  const { screen, rtl } = await mountApp('/privacy')
  const group = screen.getByRole('group', { name: 'Color theme' })
  assert.equal(group.querySelectorAll('input[type="radio"]').length, 3)
  assert.equal((screen.getByRole('radio', { name: 'Match my device' }) as HTMLInputElement).checked, true)
  rtl.fireEvent.click(screen.getByRole('radio', { name: 'Night' }))
  assert.equal(document.documentElement.dataset.theme, 'dark')
  assert.equal(window.localStorage.getItem('roadsmith:theme'), 'dark')
  rtl.fireEvent.click(screen.getByRole('radio', { name: 'Day' }))
  assert.equal(document.documentElement.dataset.theme, 'light')
  rtl.fireEvent.click(screen.getByRole('radio', { name: 'Match my device' }))
  assert.equal(document.documentElement.dataset.theme, undefined)
  rtl.cleanup()
})

test('a saved theme is applied on load, and a corrupt one is ignored', async () => {
  const saved = await mountApp('/privacy', { local: { 'roadsmith:theme': 'light' } })
  assert.equal((saved.screen.getByRole('radio', { name: 'Day' }) as HTMLInputElement).checked, true)
  assert.equal(document.documentElement.dataset.theme, 'light')
  saved.rtl.cleanup()
  const corrupt = await mountApp('/privacy', { local: { 'roadsmith:theme': '"><script>' } })
  assert.equal((corrupt.screen.getByRole('radio', { name: 'Match my device' }) as HTMLInputElement).checked, true)
  assert.equal(document.documentElement.dataset.theme, undefined)
  corrupt.rtl.cleanup()
})

test('the vehicle box stores a cleaned vehicle, offers to clear it, and clearing removes it from storage', async () => {
  const { screen, rtl } = await mountApp('/')
  const box = screen.getByRole('textbox', { name: 'Your vehicle' }) as HTMLInputElement
  assert.equal(screen.queryByRole('button', { name: 'Clear vehicle' }), null)
  rtl.fireEvent.change(box, { target: { value: '2019 <b>Toyota</b> Camry' } })
  assert.equal(window.localStorage.getItem('roadsmith:vehicle'), '2019 bToyota/b Camry')
  rtl.fireEvent.click(screen.getByRole('button', { name: 'Clear vehicle' }))
  assert.equal(box.value, '')
  assert.equal(window.localStorage.getItem('roadsmith:vehicle'), null)
  assert.ok(screen.getByText(/Stays in this browser/))
  rtl.cleanup()
})

test('the app still works when the browser refuses to store anything', async () => {
  const { rtl } = await mountApp('/')
  rtl.cleanup()
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('blocked', 'SecurityError')
    },
  })
  try {
    const blocked = await mountApp('/')
    assert.ok(blocked.screen.getByRole('textbox', { name: 'Your vehicle' }))
    blocked.rtl.fireEvent.click(blocked.screen.getByRole('radio', { name: 'Night' }))
    assert.equal(document.documentElement.dataset.theme, 'dark')
    blocked.rtl.cleanup()
  } finally {
    if (original) Object.defineProperty(window, 'localStorage', original)
  }
})
