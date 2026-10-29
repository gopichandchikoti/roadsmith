import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mountApp, realCatalogSource, stubClipboard } from '../setup/ui'

const { setCatalogSource, resetCatalogCache } = await import('../../src/api')

beforeEach(() => setCatalogSource(realCatalogSource))
after(() => resetCatalogCache())

const externalLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')]

test('a problem you can fix shows its verdict on the ladder, its steps and its checklist', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire')
  await rtl.waitFor(() => assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'Flat tire'))
  assert.equal(document.title, 'Flat tire | Roadsmith')
  const ladder = screen.getByRole('list', { name: 'The three possible outcomes' })
  const rows = ladder.querySelectorAll('li')
  assert.equal(rows.length, 3)
  const current = [...rows].filter((row) => row.getAttribute('aria-current') === 'true')
  assert.equal(current.length, 1)
  assert.match(current[0]?.textContent ?? '', /Fix it here.*This problem/)
  assert.equal(screen.queryByText('Do not drive this car'), null)
  assert.equal(screen.getByRole('heading', { name: 'Steps to fix it' }).tagName, 'H2')
  const steps = screen.getByRole('heading', { name: 'Steps to fix it' }).closest('section') as HTMLElement
  assert.equal(steps.querySelectorAll('ol > li').length, 6)
  assert.ok(screen.getByText('Some experience needed'))
  assert.ok(screen.getByText('30 minutes'))
  assert.ok(screen.getByText(/Pulled over\?/))
  rtl.cleanup()
})

test('a problem that needs help shows the warning first, with one way to find a mechanic or tow', async () => {
  const { screen, rtl } = await mountApp('/fix/tire-bulge')
  await rtl.waitFor(() => assert.ok(screen.getByText('Do not drive this car')))
  const current = document.querySelector('[aria-current="true"]')
  assert.match(current?.textContent ?? '', /Get help.*This problem/)
  assert.ok(screen.getByRole('heading', { name: 'While you wait' }))
  const mechanic = externalLinks().filter((link) => /mechanic or tow truck/i.test(link.textContent ?? ''))
  assert.equal(mechanic.length, 1, 'the mechanic link should appear once, in the warning')
  rtl.cleanup()
})

test('the checklist counts ticks, announces when everything is ready and keeps ticks for this tab', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire')
  await rtl.waitFor(() => assert.ok(screen.getByText('0 of 6 ready')))
  const tools = screen.getByRole('heading', { name: 'Tools and parts' }).closest('section') as HTMLElement
  const boxes = rtl.within(tools).getAllByRole('checkbox') as HTMLInputElement[]
  assert.equal(boxes.length, 6)
  rtl.fireEvent.click(boxes[0] as HTMLInputElement)
  assert.ok(screen.getByText('1 of 6 ready'))
  assert.equal(window.sessionStorage.getItem('roadsmith:checks:flat-tire'), '0')
  for (const box of boxes.slice(1)) rtl.fireEvent.click(box)
  assert.ok(screen.getByText('6 of 6 ready'))
  const done = screen.getByText('Everything is ready.')
  assert.equal(done.getAttribute('aria-live'), 'polite')
  rtl.fireEvent.click(boxes[2] as HTMLInputElement)
  assert.equal(screen.queryByText('Everything is ready.'), null)
  assert.equal(window.sessionStorage.getItem('roadsmith:checks:flat-tire'), '0,1,3,4,5')
  rtl.cleanup()

  const again = await mountApp('/fix/flat-tire', { session: { 'roadsmith:checks:flat-tire': '1,4' } })
  await rtl.waitFor(() => assert.ok(again.screen.getByText('2 of 6 ready')))
  assert.equal(window.localStorage.length, 0)
  again.rtl.cleanup()
})

test('corrupt ticks in storage are ignored', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire', { session: { 'roadsmith:checks:flat-tire': '<b>,99,-1,2,2' } })
  await rtl.waitFor(() => assert.ok(screen.getByText('1 of 6 ready')))
  rtl.cleanup()
})

test('every link that leaves the app opens in a new tab with no opener and no referrer, and names a host we expect', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire', { local: { 'roadsmith:vehicle': '2019 Toyota Camry' } })
  await rtl.waitFor(() => assert.ok(screen.getByText('For your 2019 Toyota Camry')))
  const links = externalLinks()
  assert.ok(links.length >= 4, `only ${links.length} external links`)
  for (const link of links) {
    assert.match(link.rel, /\bnoopener\b/)
    assert.match(link.rel, /\bnoreferrer\b/)
    assert.ok(['www.youtube.com', 'www.google.com'].includes(new URL(link.href).hostname), link.href)
    assert.match(link.textContent ?? '', /opens in a new tab/)
  }
  const video = links.find((link) => new URL(link.href).hostname === 'www.youtube.com')
  assert.equal(new URL(video?.href ?? '').searchParams.get('search_query'), '2019 Toyota Camry how to change a flat tire')
  assert.ok(
    links.some((link) => /tire shop/i.test(link.textContent ?? '')),
    'a tire problem offers a tire shop',
  )
  rtl.cleanup()
})

test('a vehicle stored with markup is cleaned before it is shown or used in a link', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire', {
    local: { 'roadsmith:vehicle': '<img src=x onerror=alert(1)>Camry' },
  })
  await rtl.waitFor(() => assert.equal(screen.getByRole('heading', { level: 1 }).textContent, 'Flat tire'))
  assert.equal(document.querySelector('img'), null)
  assert.ok(screen.getByText('For your img srcx onerroralert1Camry'))
  rtl.cleanup()
})

test('without a vehicle the tutorial text says how to add one', async () => {
  const { screen, rtl } = await mountApp('/fix/dead-battery')
  await rtl.waitFor(() => assert.ok(screen.getByText(/Add your vehicle on the home screen/)))
  assert.equal(screen.queryByText(/^For your/), null)
  assert.equal(
    externalLinks().some((link) => /tire shop/i.test(link.textContent ?? '')),
    false,
  )
  rtl.cleanup()
})

test('Back goes to the list when the visit began on the problem, and Start over always does', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire')
  await rtl.waitFor(() => assert.ok(screen.getByRole('link', { name: 'Start over' })))
  rtl.fireEvent.click(screen.getByRole('link', { name: 'Back' }))
  await rtl.waitFor(() => assert.equal(window.location.pathname, '/'))
  rtl.cleanup()

  const second = await mountApp('/fix/flat-tire')
  await rtl.waitFor(() => assert.ok(second.screen.getByRole('link', { name: 'Start over' })))
  rtl.fireEvent.click(second.screen.getByRole('link', { name: 'Start over' }))
  await rtl.waitFor(() => assert.equal(window.location.pathname, '/'))
  second.rtl.cleanup()
})

test('a problem that is not in the catalog says so instead of showing a blank screen', async () => {
  const { screen, rtl } = await mountApp('/fix/does-not-exist')
  await rtl.waitFor(() => assert.ok(screen.getByText('That problem is not in the list')))
  assert.equal(screen.getByRole('link', { name: 'Go to the problem list' }).getAttribute('href'), '/')
  rtl.cleanup()
})

test('every problem in the catalog opens without error and shows its own name', async () => {
  const catalog = await realCatalogSource()
  for (const problem of catalog.problems) {
    const { screen, rtl } = await mountApp(`/fix/${problem.id}`)
    await rtl.waitFor(() => assert.equal(screen.getByRole('heading', { level: 1 }).textContent, problem.name))
    assert.equal(document.querySelectorAll('main h1').length, 1)
    rtl.cleanup()
  }
})

test('each repair step can be ticked, the next one is marked, and ticks are kept for this tab under their own key', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire')
  await rtl.waitFor(() => assert.ok(screen.getByText('0 of 6 done')))
  const panel = screen.getByRole('heading', { name: 'Steps to fix it' }).closest('section') as HTMLElement
  const items = () => [...panel.querySelectorAll('li')]
  const boxes = rtl.within(panel).getAllByRole('checkbox') as HTMLInputElement[]
  assert.equal(boxes.length, 6)
  assert.equal(items()[0]?.getAttribute('aria-current'), 'step')
  assert.equal(rtl.within(panel).getAllByText('Next').length, 1)

  rtl.fireEvent.click(boxes[0] as HTMLInputElement)
  rtl.fireEvent.click(boxes[1] as HTMLInputElement)
  assert.ok(screen.getByText('2 of 6 done'))
  assert.equal(items()[2]?.getAttribute('aria-current'), 'step')
  assert.equal(window.sessionStorage.getItem('roadsmith:steps:flat-tire'), '0,1')
  assert.equal(window.sessionStorage.getItem('roadsmith:checks:flat-tire'), null, 'the tool ticks are a separate key')

  rtl.fireEvent.click(boxes[4] as HTMLInputElement)
  assert.equal(items()[2]?.getAttribute('aria-current'), 'step', 'a later tick does not move Next past an undone step')

  for (const index of [2, 3, 5]) rtl.fireEvent.click(boxes[index] as HTMLInputElement)
  const done = screen.getByText('Every step is done. If the problem is still there, get help.')
  assert.equal(done.getAttribute('aria-live'), 'polite')
  assert.equal(panel.querySelectorAll('[aria-current="step"]').length, 0)
  assert.equal(rtl.within(panel).queryByText('Next'), null)
  rtl.cleanup()

  const again = await mountApp('/fix/flat-tire', { session: { 'roadsmith:steps:flat-tire': '0,2' } })
  await rtl.waitFor(() => assert.ok(again.screen.getByText('2 of 6 done')))
  const reopened = again.screen.getByRole('heading', { name: 'Steps to fix it' }).closest('section') as HTMLElement
  assert.equal(reopened.querySelectorAll('li')[1]?.getAttribute('aria-current'), 'step')
  again.rtl.cleanup()
})

test('corrupt step ticks in storage are ignored', async () => {
  const { screen, rtl } = await mountApp('/fix/flat-tire', { session: { 'roadsmith:steps:flat-tire': '<b>,99,-1,2,2' } })
  await rtl.waitFor(() => assert.ok(screen.getByText('1 of 6 done')))
  rtl.cleanup()
})

test('a problem that needs a shop or a tow has a summary to read out and copy, and a fixable one does not', async () => {
  const catalog = await realCatalogSource()
  const bulge = catalog.problems.find((problem) => problem.id === 'tire-bulge')
  assert.ok(bulge)
  const { screen, rtl } = await mountApp('/fix/tire-bulge', { local: { 'roadsmith:vehicle': '2019 Toyota Camry' } })
  await rtl.waitFor(() => assert.ok(screen.getByRole('heading', { name: 'What to tell them' })))
  const text = screen.getByRole('textbox', { name: 'Summary to read out' }) as HTMLTextAreaElement
  assert.equal(text.readOnly, true)
  assert.equal(text.value, `Vehicle: 2019 Toyota Camry\nProblem: ${bulge.name}\nDetails: ${bulge.summary}`)

  const written = stubClipboard('works')
  rtl.fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }))
  await rtl.waitFor(() => assert.ok(screen.getByText('Copied to your clipboard.')))
  assert.deepEqual(written, [text.value])
  assert.equal(screen.getByText('Copied to your clipboard.').getAttribute('aria-live'), 'polite')
  assert.equal(window.localStorage.getItem('roadsmith:vehicle'), '2019 Toyota Camry')
  assert.equal(window.sessionStorage.length, 0, 'the summary is not stored')
  rtl.cleanup()

  const limp = await mountApp('/fix/leaking-valve')
  await rtl.waitFor(() => assert.ok(limp.screen.getByRole('heading', { name: 'What to tell them' })))
  const noVehicle = limp.screen.getByRole('textbox', { name: 'Summary to read out' }) as HTMLTextAreaElement
  assert.ok(!/Vehicle:/.test(noVehicle.value), 'a line with nothing to say is left out')
  limp.rtl.cleanup()

  const fixable = await mountApp('/fix/flat-tire')
  await rtl.waitFor(() => assert.ok(fixable.screen.getByRole('heading', { name: 'Steps to fix it' })))
  assert.equal(fixable.screen.queryByRole('heading', { name: 'What to tell them' }), null)
  fixable.rtl.cleanup()
})

test('a copy the browser refuses, or cannot do, says so and leaves the text to select', async () => {
  for (const behaviour of ['refuses', 'missing'] as const) {
    const { screen, rtl } = await mountApp('/fix/tire-bulge')
    await rtl.waitFor(() => assert.ok(screen.getByRole('heading', { name: 'What to tell them' })))
    const written = stubClipboard(behaviour)
    rtl.fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }))
    await rtl.waitFor(() => assert.ok(screen.getByText('Could not copy. Select the text and copy it yourself.')))
    assert.equal(screen.queryByText('Copied to your clipboard.'), null)
    assert.deepEqual(written, [])
    assert.ok(screen.getByRole('textbox', { name: 'Summary to read out' }))
    rtl.cleanup()
  }
})
