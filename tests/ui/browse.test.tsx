import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { realCatalogSource, mountApp } from '../setup/ui'

const { setCatalogSource } = await import('../../src/api')

let release: () => void = () => undefined

beforeEach(() => {
  // The catalog arrives only when the test lets it, so the loading state can be seen.
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  setCatalogSource(async () => {
    await gate
    return realCatalogSource()
  })
})

after(async () => {
  const { resetCatalogCache } = await import('../../src/api')
  resetCatalogCache()
})

test('the list shows a skeleton with one polite status while the problems load, then the grouped list', async () => {
  const { screen, rtl } = await mountApp('/')
  assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'What is going wrong?')
  const status = screen.getByRole('status')
  assert.equal(status.getAttribute('aria-live'), 'polite')
  assert.match(status.textContent ?? '', /Loading problems/)
  release()
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  assert.equal(screen.getAllByRole('heading', { level: 2 }).length, 8)
  assert.equal(screen.getAllByRole('link', { name: /Flat tire/ }).length, 1)
  rtl.cleanup()
})

test('typing a search narrows the list, puts it in the address and the clear button resets it', async () => {
  release()
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  const box = screen.getByRole('searchbox', { name: 'Search problems' }) as HTMLInputElement
  rtl.fireEvent.change(box, { target: { value: 'battery' } })
  await rtl.waitFor(() => assert.ok(screen.getByText(/^[2-9] problems$/)))
  assert.equal(window.location.search, '?q=battery')
  assert.ok(screen.getByRole('link', { name: /Dead battery/ }))
  assert.equal(screen.queryByRole('link', { name: /Flat tire/ }), null)
  rtl.fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  assert.equal(window.location.search, '')
  assert.equal(box.value, '')
  rtl.cleanup()
})

test('a space can be typed in the search box without being trimmed away', async () => {
  release()
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  const box = screen.getByRole('searchbox') as HTMLInputElement
  rtl.fireEvent.change(box, { target: { value: 'flat ' } })
  assert.equal(box.value, 'flat ')
  rtl.fireEvent.change(box, { target: { value: 'flat t' } })
  assert.equal(box.value, 'flat t')
  rtl.cleanup()
})

test('the category list filters, keeps the search, and lives in the address', async () => {
  release()
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  const select = screen.getByRole('combobox', { name: 'Category' }) as HTMLSelectElement
  rtl.fireEvent.change(select, { target: { value: 'tires' } })
  await rtl.waitFor(() => assert.ok(screen.getByText('6 problems')))
  assert.equal(window.location.search, '?category=tires')
  assert.equal(screen.getAllByRole('heading', { level: 2 }).length, 1)
  rtl.cleanup()
})

test('an address with a search and a category opens already filtered, and an unknown category is ignored', async () => {
  release()
  const { screen, rtl } = await mountApp('/?q=tire&category=nowhere')
  await rtl.waitFor(() => assert.ok(screen.getByText(/^\d+ problems?$/)))
  const select = screen.getByRole('combobox', { name: 'Category' }) as HTMLSelectElement
  assert.equal(select.value, '')
  assert.equal((screen.getByRole('searchbox') as HTMLInputElement).value, 'tire')
  rtl.cleanup()
})

test('no match gives an empty state that says why and clears the filters', async () => {
  release()
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  rtl.fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } })
  await rtl.waitFor(() => assert.ok(screen.getByText('No problems match')))
  assert.match(screen.getByText(/Nothing matches/).textContent ?? '', /"zzzz"/)
  assert.ok(screen.getByText('0 problems'))
  rtl.fireEvent.click(screen.getByRole('button', { name: 'Clear search and category' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  rtl.cleanup()
})

test('text in the search is shown as text, never as markup', async () => {
  release()
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  rtl.fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'img onerror alert' } })
  await rtl.waitFor(() => assert.ok(screen.getByText('No problems match')))
  assert.equal(document.querySelector('img'), null)
  rtl.cleanup()
})

test('Back after a search restores the search the address holds', async () => {
  release()
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  const box = screen.getByRole('searchbox') as HTMLInputElement
  rtl.fireEvent.change(box, { target: { value: 'flat' } })
  await rtl.waitFor(() => assert.equal(window.location.search, '?q=flat'))
  window.history.replaceState(null, '', '/?q=smoke')
  rtl.fireEvent(window, new window.PopStateEvent('popstate'))
  await rtl.waitFor(() => assert.equal(box.value, 'smoke'))
  rtl.cleanup()
})
