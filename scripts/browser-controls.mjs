// Positive controls for browser-check.mjs (AGENTS.md PRC-10): plant an accessibility fault, an off-screen element and a script that breaks the
// content security policy in a real page, and confirm each scanner reports it. A clean result means nothing until these pass.
//
// Needs puppeteer-core and axe-core, which are not dependencies of this project. Install them in a scratch folder outside the
// repository (npm i puppeteer-core axe-core) and point TOOLS_DIR at it. CHROME_PATH is the browser; BASE is the running server
// (default http://127.0.0.1:4620, start it with pnpm start after pnpm build); OUT is where screenshots and report.json go.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const toolsDir = process.env.TOOLS_DIR
const chromePath = process.env.CHROME_PATH
if (!toolsDir || !chromePath)
  throw new Error('Set TOOLS_DIR (a folder with puppeteer-core and axe-core installed) and CHROME_PATH.')
const require = createRequire(path.join(path.resolve(toolsDir), 'noop.js'))
const puppeteer = (await import(pathToFileURL(require.resolve('puppeteer-core')).href)).default
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844 })
await page.evaluateOnNewDocument(() => {
  window.cspEvents = []
  document.addEventListener('securitypolicyviolation', (event) => window.cspEvents.push(event.violatedDirective))
})
await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:4620'}/privacy`, { waitUntil: 'load' })
await page.waitForSelector('h1')

// 1. axe: an image with no text alternative and a button with no name.
await page.evaluate(() => {
  const image = document.createElement('img')
  image.src = '/favicon.svg'
  document.body.append(image)
  const button = document.createElement('button')
  document.body.append(button)
})
await page.evaluate(axeSource)
const axe = await page.evaluate(() => window.axe.run(document))
const axeIds = axe.violations.map((violation) => violation.id)

// 2. overflow: an element wider than the screen.
await page.evaluate(() => {
  const wide = document.createElement('div')
  wide.style.width = '2000px'
  wide.style.height = '10px'
  document.body.append(wide)
})
const overflow = await page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  inner: window.innerWidth,
  offenders: [...document.querySelectorAll('body *')].filter((el) => {
    if (el.closest('.visually-hidden, .skip-link')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 1 || r.left < -1)
  }).length,
}))

// 3. CSP: an inline script and a script from another origin.
await page.evaluate(() => {
  const inline = document.createElement('script')
  inline.textContent = 'window.planted = true'
  document.body.append(inline)
  const remote = document.createElement('script')
  remote.src = 'https://example.com/x.js'
  document.body.append(remote)
})
await new Promise((resolve) => setTimeout(resolve, 600))
const csp = await page.evaluate(() => ({ events: window.cspEvents, ran: Boolean(window.planted) }))
await browser.close()

process.stdout.write(
  [
    `axe reported: ${axeIds.join(', ') || 'nothing'}`,
    `overflow: scrollWidth ${overflow.scroll} vs ${overflow.inner} (clip hides it), element bounds found ${overflow.offenders} offender(s)`,
    `CSP events: ${csp.events.join(', ') || 'none'}; inline script ran: ${csp.ran}`,
  ].join('\n') + '\n',
)
