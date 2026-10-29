// Real-browser check of the production build (AGENTS.md TEST-10): screenshots at five widths in both themes, element-bounds
// overflow, console and CSP events, an axe-core scan, keyboard focus, reduced motion and throttled load numbers.
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
const BASE = process.env.BASE ?? 'http://127.0.0.1:4620'
const OUT = process.env.OUT
if (!OUT) throw new Error('Set OUT to a folder for the screenshots and report.')
fs.mkdirSync(OUT, { recursive: true })

const WIDTHS = [
  [320, 700],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
]
const ROUTES = [
  ['home', '/'],
  ['search', '/?q=battery'],
  ['diagnose', '/diagnose'],
  ['likely', '/diagnose/wont-start/2'],
  ['fix', '/fix/flat-tire'],
  ['help', '/fix/tire-bulge'],
  ['privacy', '/privacy'],
  ['notfound', '/nowhere'],
]
const report = { screenshots: 0, overflow: [], console: [], failedRequests: [], csp: [], axe: [], focus: [], notes: [] }

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] })

async function openPage(scheme, width, height, reduced = false) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 })
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: scheme },
    { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' },
  ])
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      report.console.push(`${scheme} ${width} ${message.type()}: ${message.text()}`)
  })
  page.on('requestfailed', (request) => report.failedRequests.push(`${request.url()} ${request.failure()?.errorText}`))
  page.on('response', (response) => {
    if (response.status() >= 400) report.failedRequests.push(`${response.url()} ${response.status()}`)
  })
  await page.evaluateOnNewDocument(() => {
    window.cspEvents = []
    document.addEventListener('securitypolicyviolation', (event) =>
      window.cspEvents.push(`${event.violatedDirective} ${event.blockedURI}`),
    )
  })
  return page
}

async function settle(page) {
  await page.waitForSelector('h1', { timeout: 8000 })
  await page.waitForNetworkIdle({ idleTime: 250, timeout: 8000 }).catch(() => undefined)
  await page.evaluate(() => document.fonts.ready)
  await new Promise((resolve) => setTimeout(resolve, 650))
}

for (const scheme of ['dark', 'light']) {
  for (const [width, height] of WIDTHS) {
    const page = await openPage(scheme, width, height)
    for (const [name, route] of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' })
      await settle(page)
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((el) => {
            if (el.closest('.visually-hidden, .skip-link')) return false
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 1 || r.left < -1)
          })
          .slice(0, 3)
          .map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]),
      )
      if (offenders.length) report.overflow.push(`${scheme} ${width} ${name}: ${offenders.join(', ')}`)
      const csp = await page.evaluate(() => window.cspEvents)
      for (const violation of csp) report.csp.push(`${scheme} ${width} ${name}: ${violation}`)
      await page.screenshot({
        path: path.join(OUT, `${name}-${width}-${scheme}.webp`),
        type: 'webp',
        quality: 82,
        fullPage: true,
      })
      report.screenshots += 1
      if (width === 390 || width === 1440) {
        await page.evaluate(axeSource)
        const result = await page.evaluate(() =>
          window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] },
          }),
        )
        for (const violation of result.violations) {
          report.axe.push(
            `${scheme} ${width} ${name}: ${violation.id} (${violation.impact}) x${violation.nodes.length} ${violation.nodes[0]?.html?.slice(0, 120)}`,
          )
        }
      }
    }
    await page.close()
  }
}

// Keyboard: Tab order starts at the skip link, and every focused control shows a visible ring.
{
  const page = await openPage('dark', 390, 844)
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  await settle(page)
  const stops = []
  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press('Tab')
    stops.push(
      await page.evaluate(() => {
        const element = document.activeElement
        const style = getComputedStyle(element)
        return {
          tag: element.tagName,
          label: (element.getAttribute('aria-label') || element.textContent || element.id || '').trim().slice(0, 40),
          outline: `${style.outlineStyle} ${style.outlineWidth}`,
          offset: style.outlineOffset,
        }
      }),
    )
    if (index === 0) await page.screenshot({ path: path.join(OUT, 'focus-skip-390-dark.webp'), type: 'webp', quality: 82 })
    if (index === 4) await page.screenshot({ path: path.join(OUT, 'focus-control-390-dark.webp'), type: 'webp', quality: 82 })
  }
  report.focus = stops
  await page.close()
}

// Reduced motion: the screen entrance has no travel.
{
  const page = await openPage('dark', 390, 844, true)
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  await settle(page)
  await page.click('a[href="/privacy"]')
  await page.waitForSelector('.legal')
  report.notes.push(
    `reduced motion: entrance animation-duration = ${await page.evaluate(() => getComputedStyle(document.querySelector('.main > *')).animationDuration)}`,
  )
  await page.close()
}

// Throttled load: 4x CPU slowdown and a slow 4G profile, as in the standard.
{
  const page = await openPage('dark', 390, 844)
  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.evaluateOnNewDocument(() => {
    window.perfSamples = { lcp: 0, cls: 0, interactions: [] }
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.perfSamples.lcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.perfSamples.cls += entry.value
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.perfSamples.interactions.push(Math.round(entry.duration))
    }).observe({ type: 'event', durationThreshold: 16, buffered: true })
  })
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  await settle(page)
  const bytes = await page.evaluate(() =>
    performance.getEntriesByType('resource').reduce((total, entry) => total + (entry.encodedBodySize || 0), 0),
  )
  const firstScreen = await page.evaluate(() => ({
    lcp: Math.round(window.perfSamples.lcp),
    cls: Number(window.perfSamples.cls.toFixed(4)),
  }))
  await page.click('a[href="/fix/flat-tire"]')
  await page.waitForSelector('.fix')
  await new Promise((resolve) => setTimeout(resolve, 600))
  await page.type('input[type=search], input.field__input', 'x').catch(() => undefined)
  const interactions = await page.evaluate(() => window.perfSamples.interactions)
  report.notes.push(
    `throttled (4x CPU, 1.6 Mbit/s, 150 ms): LCP ${firstScreen.lcp} ms, CLS ${firstScreen.cls}, transferred ${Math.round(bytes / 1024)} KiB (compressed), slowest interactions ${JSON.stringify(interactions.sort((a, b) => b - a).slice(0, 4))} ms`,
  )
  await page.close()
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
process.stdout.write(
  [
    `screenshots: ${report.screenshots}`,
    `horizontal overflow: ${report.overflow.length}`,
    ...report.overflow.slice(0, 8),
    `console errors/warnings: ${report.console.length}`,
    ...[...new Set(report.console)].slice(0, 8),
    `failed requests: ${report.failedRequests.length}`,
    ...[...new Set(report.failedRequests)].slice(0, 8),
    `CSP violations: ${report.csp.length}`,
    ...report.csp.slice(0, 5),
    `axe violations: ${report.axe.length}`,
    ...report.axe.slice(0, 20),
    ...report.notes,
    `focus stops: ${report.focus.map((stop) => `${stop.tag}:${stop.label}[${stop.outline}]`).join(' | ')}`,
  ].join('\n') + '\n',
)
