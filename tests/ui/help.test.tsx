import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { mountApp, stubClipboard } from '../setup/ui'

const { setCatalogSource, resetCatalogCache } = await import('../../src/api')

after(() => resetCatalogCache())

const externalLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')]

test('the Help screen opens from a link on the home and result screens, and takes focus to its heading', async () => {
  const { screen, rtl } = await mountApp('/')
  const link = await screen.findByRole('link', { name: 'Get help now' })
  assert.equal(link.getAttribute('href'), '/help')
  rtl.fireEvent.click(link)
  const heading = await screen.findByRole('heading', { level: 1, name: 'Get help now' })
  assert.equal(window.location.pathname, '/help')
  assert.equal(document.title, 'Get help now | Roadsmith')
  await rtl.waitFor(() => assert.equal(document.activeElement, heading))
  rtl.cleanup()

  const result = await mountApp('/fix/tire-bulge')
  assert.equal((await result.screen.findByRole('link', { name: 'Get help now' })).getAttribute('href'), '/help')
  result.rtl.cleanup()
})

test('the Help screen leads with the emergency line, holds no link to itself and needs no catalog', async () => {
  let catalogRequests = 0
  setCatalogSource(async () => {
    catalogRequests += 1
    throw new Error('offline')
  })
  const { screen, rtl } = await mountApp('/help')
  await screen.findByRole('heading', { level: 1, name: 'Get help now' })
  assert.match(document.querySelector('.hazard-note')?.textContent ?? '', /call your local emergency number first/)
  assert.equal(screen.queryByRole('link', { name: 'Get help now' }), null, 'the page does not link to itself')
  assert.equal(document.querySelectorAll('main h1').length, 1)
  assert.equal(catalogRequests, 0, 'the Help screen never asks for the catalog')
  assert.ok(screen.getByRole('heading', { level: 2, name: 'Make the car safe' }))
  assert.ok(screen.getByRole('heading', { level: 2, name: 'Find help nearby' }))
  assert.ok(screen.getByRole('heading', { level: 2, name: 'What to tell them' }))
  rtl.cleanup()
})

test('the safety list can be ticked in order, is kept for this tab, and announces when it is done', async () => {
  const { screen, rtl } = await mountApp('/help')
  await screen.findByRole('heading', { level: 2, name: 'Make the car safe' })
  const panel = screen.getByRole('heading', { level: 2, name: 'Make the car safe' }).closest('section') as HTMLElement
  const boxes = rtl.within(panel).getAllByRole('checkbox') as HTMLInputElement[]
  assert.equal(boxes.length, 5)
  assert.ok(screen.getByText('0 of 5 done'))
  assert.equal(panel.querySelector('li')?.getAttribute('aria-current'), 'step')
  rtl.fireEvent.click(boxes[0] as HTMLInputElement)
  assert.ok(screen.getByText('1 of 5 done'))
  assert.equal(window.sessionStorage.getItem('roadsmith:safety'), '0')
  for (const box of boxes.slice(1)) rtl.fireEvent.click(box)
  const done = screen.getByText('That is as safe as you can make it. Now get help.')
  assert.equal(done.getAttribute('aria-live'), 'polite')
  rtl.cleanup()

  const again = await mountApp('/help', { session: { 'roadsmith:safety': '0,1,<i>,99' } })
  await again.screen.findByRole('heading', { level: 2, name: 'Make the car safe' })
  assert.ok(again.screen.getByText('2 of 5 done'))
  again.rtl.cleanup()
})

test('the nearby links are map searches only, open in a new tab and send no referrer', async () => {
  const { screen, rtl } = await mountApp('/help')
  await screen.findByRole('heading', { level: 1, name: 'Get help now' })
  const links = externalLinks()
  assert.equal(links.length, 3)
  for (const link of links) {
    const address = new URL(link.href)
    assert.equal(address.hostname, 'www.google.com')
    assert.equal(address.pathname, '/maps/search/')
    assert.match(link.rel, /\bnoopener\b/)
    assert.match(link.rel, /\bnoreferrer\b/)
    assert.match(link.textContent ?? '', /opens in a new tab/)
  }
  assert.ok(links.some((link) => /tow truck/i.test(link.textContent ?? '')))
  assert.ok(screen.getByText(/Note where you are before you call/))
  rtl.cleanup()
})

test('the summary is built from the vehicle and what the driver types, cleaned, and is empty until there is something to say', async () => {
  const { screen, rtl } = await mountApp('/help')
  await screen.findByRole('heading', { level: 1, name: 'Get help now' })
  assert.equal(screen.queryByRole('textbox', { name: 'Summary to read out' }), null)
  assert.ok(screen.getByText('Add your vehicle and say what happened, and your summary appears here.'))
  const copy = screen.getByRole('button', { name: 'Copy summary' }) as HTMLButtonElement
  assert.equal(copy.disabled, true, 'there is nothing to copy yet')

  rtl.fireEvent.change(screen.getByRole('textbox', { name: 'Your vehicle' }), { target: { value: '2019 Toyota Camry' } })
  rtl.fireEvent.change(screen.getByRole('textbox', { name: 'What happened' }), {
    target: { value: 'flat   <b>tire</b>\non the left' },
  })
  const summary = screen.getByRole('textbox', { name: 'Summary to read out' }) as HTMLTextAreaElement
  assert.equal(summary.value, 'Vehicle: 2019 Toyota Camry\nProblem: flat b tire /b on the left')
  assert.equal(copy.disabled, false)
  assert.equal((screen.getByRole('textbox', { name: 'What happened' }) as HTMLInputElement).maxLength, 120)
  assert.equal(window.sessionStorage.length, 0, 'what was typed is not stored')
  assert.equal(window.localStorage.getItem('roadsmith:vehicle'), '2019 Toyota Camry')
  assert.equal(window.localStorage.length, 1, 'the vehicle is the only thing kept in local storage, not the note')
  assert.ok(
    ![...Array(window.localStorage.length).keys()].some((index) =>
      window.localStorage.getItem(window.localStorage.key(index) ?? '')?.includes('tire'),
    ),
  )

  rtl.fireEvent.click(screen.getByRole('button', { name: 'Clear what happened' }))
  assert.equal(summary.value, 'Vehicle: 2019 Toyota Camry')
  rtl.cleanup()
})

test('copying writes the summary to the clipboard once, names the result, and a changed summary clears the message', async () => {
  const { screen, rtl } = await mountApp('/help', { local: { 'roadsmith:vehicle': 'Ford F-150' } })
  await screen.findByRole('heading', { level: 1, name: 'Get help now' })
  const written = stubClipboard('works')
  rtl.fireEvent.change(screen.getByRole('textbox', { name: 'What happened' }), { target: { value: 'will not start' } })
  rtl.fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('Copied to your clipboard.')))
  assert.deepEqual(written, ['Vehicle: Ford F-150\nProblem: will not start'])

  rtl.fireEvent.change(screen.getByRole('textbox', { name: 'What happened' }), { target: { value: 'will not start, clicks' } })
  assert.equal(screen.queryByText('Copied to your clipboard.'), null, 'the message belonged to the old text')
  rtl.cleanup()
})

test('a refused or missing clipboard is reported, never shown as a success', async () => {
  for (const behaviour of ['refuses', 'missing'] as const) {
    const { screen, rtl } = await mountApp('/help')
    await screen.findByRole('heading', { level: 1, name: 'Get help now' })
    const written = stubClipboard(behaviour)
    rtl.fireEvent.change(screen.getByRole('textbox', { name: 'What happened' }), { target: { value: 'flat tire' } })
    rtl.fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }))
    await rtl.waitFor(() => assert.ok(screen.getByText('Could not copy. Select the text and copy it yourself.')))
    assert.equal(screen.queryByText('Copied to your clipboard.'), null)
    assert.deepEqual(written, [])
    rtl.cleanup()
  }
})

test('the Help screen offers the guided questions for a driver who does not know the problem', async () => {
  const { screen, rtl } = await mountApp('/help')
  const action = await screen.findByRole('link', { name: 'Help me find it' })
  assert.equal(action.getAttribute('href'), '/diagnose')
  rtl.cleanup()
})
