import assert from 'node:assert/strict'
import test from 'node:test'
import { readText } from '../setup/data'

type Pair = { foreground: string; background: string; minimum: number }
type Theme = 'night' | 'day'

const tokensCss = readText('src/themes/tokens.css')
const [mainBlock = '', fallbackBlock = ''] = tokensCss.split('@supports not')

/** `--color-name: light-dark(#day, #night);` or `--color-name: #both;` becomes day and night values. */
function readTokens(block: string): Map<string, Record<Theme, string>> {
  const tokens = new Map<string, Record<Theme, string>>()
  const pattern = /--color-([a-z0-9-]+):\s*(?:light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)|(#[0-9a-f]{6}))\s*;/gi
  for (const match of block.matchAll(pattern)) {
    const [, name = '', day, night, both] = match
    tokens.set(name, { day: (day ?? both ?? '').toLowerCase(), night: (night ?? both ?? '').toLowerCase() })
  }
  return tokens
}

const tokens = readTokens(mainBlock)

const channel = (hex: string, offset: number): number => {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string): number => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
const ratio = (a: string, b: string): number => {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const colour = (name: string, theme: Theme): string => {
  const value = tokens.get(name)?.[theme]
  assert.ok(value, `token --color-${name} is missing`)
  return value
}

/** Every foreground and background that the design record (system_design.md 2.2) says is used, with its minimum ratio. */
const PAIRS: readonly Pair[] = [
  { foreground: 'ink', background: 'paper', minimum: 4.5 },
  { foreground: 'ink', background: 'paper-2', minimum: 4.5 },
  { foreground: 'ink', background: 'paper-3', minimum: 4.5 },
  { foreground: 'ink-2', background: 'paper', minimum: 4.5 },
  { foreground: 'ink-2', background: 'paper-2', minimum: 4.5 },
  { foreground: 'ink-2', background: 'paper-3', minimum: 4.5 },
  { foreground: 'muted', background: 'paper', minimum: 4.5 },
  { foreground: 'muted', background: 'paper-2', minimum: 4.5 },
  { foreground: 'muted', background: 'paper-3', minimum: 4.5 },
  { foreground: 'violet', background: 'paper', minimum: 4.5 },
  { foreground: 'violet', background: 'paper-2', minimum: 4.5 },
  { foreground: 'violet', background: 'paper-3', minimum: 4.5 },
  { foreground: 'accent-ink', background: 'accent', minimum: 4.5 },
  { foreground: 'violet-ink', background: 'violet-fill', minimum: 4.5 },
  { foreground: 'ink', background: 'violet-tint', minimum: 4.5 },
  { foreground: 'ink', background: 'signal-tint', minimum: 4.5 },
  { foreground: 'violet', background: 'violet-tint', minimum: 4.5 },
  { foreground: 'paper', background: 'ink', minimum: 4.5 },
  { foreground: 'rule-strong', background: 'paper', minimum: 3 },
  { foreground: 'rule-strong', background: 'paper-2', minimum: 3 },
  { foreground: 'signal-edge', background: 'paper', minimum: 3 },
  { foreground: 'signal-edge', background: 'paper-2', minimum: 3 },
  { foreground: 'signal-edge', background: 'signal-tint', minimum: 3 },
  { foreground: 'violet', background: 'signal-tint', minimum: 3 },
  { foreground: 'focus', background: 'paper', minimum: 3 },
  { foreground: 'focus', background: 'paper-2', minimum: 3 },
  { foreground: 'brand', background: 'paper', minimum: 3 },
]

test('every colour pair the design uses meets WCAG 2.2 AA in both themes', () => {
  for (const theme of ['night', 'day'] as const) {
    for (const { foreground, background, minimum } of PAIRS) {
      const measured = ratio(colour(foreground, theme), colour(background, theme))
      assert.ok(measured >= minimum, `${theme}: ${foreground} on ${background} is ${measured.toFixed(2)}, needs ${minimum}`)
    }
  }
})

test('the primary action text on the yellow accent has the same contrast in both themes', () => {
  assert.ok(ratio(colour('accent-ink', 'night'), colour('accent', 'night')) > 12)
  assert.equal(colour('accent', 'night'), colour('accent', 'day'))
})

test('the day paper and the night paper are tinted, never pure white or black', () => {
  for (const theme of ['night', 'day'] as const) {
    for (const name of ['paper', 'paper-2', 'paper-3']) {
      assert.ok(!['#ffffff', '#000000'].includes(colour(name, theme)), `${theme} ${name} is pure`)
    }
  }
})

test('a browser without light-dark() gets exactly the night values', () => {
  const fallback = readTokens(fallbackBlock)
  assert.ok(fallback.size >= 12, 'the fallback block lost tokens')
  for (const [name, values] of fallback) {
    assert.equal(values.night, tokens.get(name)?.night, `fallback --color-${name} differs from the night value`)
  }
  for (const [name, values] of tokens) {
    if (values.night !== values.day) assert.ok(fallback.has(name), `--color-${name} differs by theme but has no fallback`)
  }
})

test('the design record lists the same colours as the stylesheet', () => {
  const record = readText('system_design.md')
  const rows = [...record.matchAll(/^\| [^|]+ \| `--color-([a-z0-9-]+)` \| `(#[0-9A-Fa-f]{6})` \| `(#[0-9A-Fa-f]{6})` \|$/gm)]
  assert.ok(rows.length >= 15, `found only ${rows.length} colour rows in system_design.md`)
  for (const [, name = '', night = '', day = ''] of rows) {
    assert.equal(colour(name, 'night'), night.toLowerCase(), `system_design.md night ${name}`)
    assert.equal(colour(name, 'day'), day.toLowerCase(), `system_design.md day ${name}`)
  }
})

test('every measured pair in the design record is at least as good as the record says', () => {
  const record = readText('system_design.md')
  const rows = [...record.matchAll(/^\| ([^|]+) on ([^|(]+?)(?: \([^)]*\))? \| (\d(?:\.\d)?) \| (\d+\.\d+) \| (\d+\.\d+) \|$/gm)]
  assert.ok(rows.length >= 12, `found only ${rows.length} contrast rows in system_design.md`)
  for (const [, fg = '', bg = '', , night = '', day = ''] of rows) {
    const foreground = fg.trim()
    const background = bg.trim()
    assert.ok(
      Math.abs(ratio(colour(foreground, 'night'), colour(background, 'night')) - Number(night)) < 0.011,
      `night ${foreground} on ${background}`,
    )
    assert.ok(
      Math.abs(ratio(colour(foreground, 'day'), colour(background, 'day')) - Number(day)) < 0.011,
      `day ${foreground} on ${background}`,
    )
  }
})
