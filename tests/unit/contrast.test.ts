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
  // Reading text on the three surfaces.
  { foreground: 'ink', background: 'paper', minimum: 4.5 },
  { foreground: 'ink', background: 'paper-2', minimum: 4.5 },
  { foreground: 'ink', background: 'paper-3', minimum: 4.5 },
  { foreground: 'ink-2', background: 'paper', minimum: 4.5 },
  { foreground: 'ink-2', background: 'paper-2', minimum: 4.5 },
  { foreground: 'ink-2', background: 'paper-3', minimum: 4.5 },
  { foreground: 'muted', background: 'paper', minimum: 4.5 },
  { foreground: 'muted', background: 'paper-2', minimum: 4.5 },
  { foreground: 'muted', background: 'paper-3', minimum: 4.5 },
  // The highlight carries links, the next-step tag and the progress count, so it is text on every surface.
  { foreground: 'highlight', background: 'paper', minimum: 4.5 },
  { foreground: 'highlight', background: 'paper-2', minimum: 4.5 },
  { foreground: 'highlight', background: 'paper-3', minimum: 4.5 },
  { foreground: 'highlight', background: 'signal-tint', minimum: 4.5 },
  // The two plates: the primary action and the hero band, and the search field that sits inside the band.
  { foreground: 'accent-ink', background: 'accent', minimum: 4.5 },
  { foreground: 'band-ink', background: 'band', minimum: 4.5 },
  { foreground: 'ink', background: 'band-ink', minimum: 4.5 },
  { foreground: 'ink-2', background: 'band-ink', minimum: 4.5 },
  { foreground: 'muted', background: 'band-ink', minimum: 4.5 },
  { foreground: 'ink', background: 'signal-tint', minimum: 4.5 },
  { foreground: 'paper', background: 'ink', minimum: 4.5 },
  // Edges and rings are not text, so they need 3:1 against what they are drawn on.
  { foreground: 'rule-strong', background: 'paper', minimum: 3 },
  { foreground: 'rule-strong', background: 'paper-2', minimum: 3 },
  { foreground: 'rule-strong', background: 'paper-3', minimum: 3 },
  { foreground: 'accent', background: 'paper', minimum: 3 },
  { foreground: 'band', background: 'paper', minimum: 3 },
  { foreground: 'focus', background: 'paper', minimum: 3 },
  { foreground: 'focus', background: 'paper-2', minimum: 3 },
  { foreground: 'focus', background: 'paper-3', minimum: 3 },
  { foreground: 'band-ink', background: 'band', minimum: 3 },
]

test('every colour pair the design uses meets WCAG 2.2 AA in both themes', () => {
  for (const theme of ['night', 'day'] as const) {
    for (const { foreground, background, minimum } of PAIRS) {
      const measured = ratio(colour(foreground, theme), colour(background, theme))
      assert.ok(measured >= minimum, `${theme}: ${foreground} on ${background} is ${measured.toFixed(2)}, needs ${minimum}`)
    }
  }
})

/** Hue in degrees (0 to 360) of a #rrggbb colour. */
function hue(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
  const max = Math.max(r, g, b)
  const spread = max - Math.min(r, g, b)
  if (spread === 0) return Number.NaN
  const sector = max === r ? ((g - b) / spread + 6) % 6 : max === g ? (b - r) / spread + 2 : (r - g) / spread + 4
  return sector * 60
}

test('the palette is yellow and black only: every colour is a tint or shade of one yellow', () => {
  assert.ok(tokens.size >= 15)
  for (const [name, values] of tokens) {
    for (const theme of ['night', 'day'] as const) {
      const value = values[theme]
      const degrees = hue(value)
      assert.ok(!Number.isNaN(degrees), `${theme} --color-${name} ${value} is a pure grey, which has no yellow in it`)
      assert.ok(degrees >= 40 && degrees <= 65, `${theme} --color-${name} ${value} has hue ${degrees.toFixed(0)}, outside yellow`)
    }
  }
})

test('the primary action and the hero band are a yellow plate at night and a black plate by day', () => {
  for (const name of ['accent', 'band']) {
    assert.equal(colour(name, 'night'), '#ffd21f', `night ${name}`)
    assert.equal(colour(name, 'day'), colour('ink', 'day'), `day ${name} is the day text colour`)
  }
  for (const name of ['accent-ink', 'band-ink']) {
    assert.equal(colour(name, 'day'), '#ffd21f', `day ${name}`)
    assert.equal(colour(name, 'night'), colour('paper', 'night'), `night ${name} is the night paper`)
  }
  assert.ok(ratio(colour('accent-ink', 'night'), colour('accent', 'night')) > 12)
  assert.ok(ratio(colour('accent-ink', 'day'), colour('accent', 'day')) > 12)
})

test('the day page is signal yellow and the night page is black', () => {
  assert.ok(ratio(colour('paper', 'night'), '#000000') < 1.2, 'night paper is near black')
  assert.ok(ratio(colour('paper', 'day'), '#ffd21f') < 1.2, 'day paper is near the signal yellow')
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
