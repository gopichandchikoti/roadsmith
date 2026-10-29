import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mountApp, realCatalogSource } from '../setup/ui'

const { setCatalogSource, resetCatalogCache } = await import('../../src/api')

beforeEach(() => setCatalogSource(realCatalogSource))
after(() => resetCatalogCache())

test('the first question lists every symptom as a link and says which question this is', async () => {
  const { screen, rtl } = await mountApp('/diagnose')
  await rtl.waitFor(() => assert.ok(screen.getByRole('link', { name: 'A warning light came on' })))
  assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'What are you noticing?')
  assert.ok(screen.getByText('Question 1 of 2'))
  assert.equal(screen.getByRole('link', { name: 'The car will not start' }).getAttribute('href'), '/diagnose/wont-start')
  const switcher = screen.getByRole('navigation', { name: 'How to find the problem' })
  assert.equal(switcher.querySelector('[aria-current="page"]')?.textContent, 'Help me find it')
  rtl.cleanup()
})

test('choosing a symptom asks the second question, and an answer shows the most likely cause first', async () => {
  const { screen, rtl } = await mountApp('/diagnose')
  await rtl.waitFor(() => assert.ok(screen.getByRole('link', { name: 'The car will not start' })))
  rtl.fireEvent.click(screen.getByRole('link', { name: 'The car will not start' }))
  await rtl.waitFor(() =>
    assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'What happens when you turn the key or press start?'),
  )
  assert.ok(screen.getByText('Question 2 of 2'))
  assert.equal(window.location.pathname, '/diagnose/wont-start')
  rtl.fireEvent.click(screen.getByRole('link', { name: 'One loud click and bright lights' }))
  await rtl.waitFor(() => assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'Most likely'))
  assert.equal(window.location.pathname, '/diagnose/wont-start/2')
  assert.equal(screen.getByRole('heading', { level: 2, name: 'One click, then nothing' }).textContent, 'One click, then nothing')
  assert.equal(screen.getByRole('link', { name: 'See the fix' }).getAttribute('href'), '/fix/starter-click')
  assert.ok(screen.getByRole('heading', { level: 2, name: 'It could also be' }))
  assert.ok(screen.getByRole('link', { name: /Dead battery/ }))
  assert.match(screen.getByText(/best guess/).textContent ?? '', /not a mechanic's diagnosis/)
  rtl.cleanup()
})

test('an answer with only one cause has no list of alternatives', async () => {
  const { screen, rtl } = await mountApp('/diagnose/dash-light/0')
  await rtl.waitFor(() => assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'Most likely'))
  assert.equal(screen.queryByRole('heading', { name: 'It could also be' }), null)
  rtl.cleanup()
})

test('Back on the second question returns to the first', async () => {
  const { screen, rtl } = await mountApp('/diagnose/noise')
  await rtl.waitFor(() => assert.ok(screen.getByText('Question 2 of 2')))
  rtl.fireEvent.click(screen.getByRole('link', { name: 'Back' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('Question 1 of 2')))
  assert.equal(window.location.pathname, '/diagnose')
  rtl.cleanup()
})

test('a symptom or answer that is not in the catalog says so and offers a way out', async () => {
  for (const address of ['/diagnose/nothing-here', '/diagnose/noise/9']) {
    const { screen, rtl } = await mountApp(address)
    await rtl.waitFor(() => assert.ok(screen.getByText('That question is not in the list')))
    assert.equal(screen.getByRole('link', { name: 'Start again' }).getAttribute('href'), '/diagnose')
    rtl.cleanup()
  }
})

test('the two ways in switch without a page load, and the choice shows in the address', async () => {
  const { screen, rtl } = await mountApp('/')
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  rtl.fireEvent.click(screen.getByRole('link', { name: 'Help me find it' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('Question 1 of 2')))
  assert.equal(window.location.pathname, '/diagnose')
  rtl.fireEvent.click(screen.getByRole('link', { name: 'I know the problem' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('37 problems')))
  assert.equal(window.location.pathname, '/')
  rtl.cleanup()
})
