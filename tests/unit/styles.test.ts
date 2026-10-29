import assert from 'node:assert/strict'
import test from 'node:test'
import { listFiles, readText } from '../setup/data'

const stylesheets = listFiles('src').filter((file) => file.endsWith('.css'))
const componentStyles = stylesheets.filter((file) => !file.endsWith('themes/tokens.css') && !file.endsWith('themes/motion.css'))
const tokensCss = readText('src/themes/tokens.css')

const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')

test('the stylesheets exist and tokens.css opens with the design stamp', () => {
  assert.ok(componentStyles.length >= 15, `only ${componentStyles.length} component stylesheets`)
  assert.match(tokensCss.trimStart(), /^\/\* Hallmark · shape: app screen/)
})

test('no component stylesheet holds a literal colour: every colour is a token (UI-02)', () => {
  for (const file of componentStyles) {
    const css = withoutComments(readText(file))
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), `${file} has a hex colour`)
    assert.ok(!/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/i.test(css), `${file} has a colour function`)
    assert.ok(!/\b(?:white|black|red|green|blue|yellow|purple|gray|grey)\b\s*[;,}]/i.test(css), `${file} has a named colour`)
  }
})

test('every custom property a stylesheet reads is defined somewhere', () => {
  const defined = new Set<string>()
  for (const file of stylesheets) for (const match of readText(file).matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(match[1] ?? '')
  for (const file of componentStyles) {
    for (const match of withoutComments(readText(file)).matchAll(/var\((--[a-z0-9-]+)/gi)) {
      assert.ok(defined.has(match[1] ?? ''), `${file} reads ${match[1]} but nothing defines it`)
    }
  }
})

test('the design decisions hold in every stylesheet: no gradient, shadow, glass, uppercase label or tracked caps', () => {
  for (const file of stylesheets.filter((name) => !name.endsWith('motion.css'))) {
    const css = withoutComments(readText(file))
    assert.ok(!/(?:linear|radial|conic)-gradient/.test(css), `${file} has a gradient`)
    assert.ok(!/box-shadow\s*:/.test(css), `${file} has a shadow`)
    assert.ok(!/backdrop-filter\s*:/.test(css), `${file} has glass`)
    assert.ok(!/text-transform\s*:\s*(?:uppercase|capitalize)/.test(css), `${file} sets text in capitals`)
    assert.ok(!/font-variant(?:-caps)?\s*:\s*small-caps/.test(css), `${file} sets small caps`)
    for (const match of css.matchAll(/letter-spacing\s*:\s*(-?[\d.]+)em/g)) {
      assert.ok(Number(match[1]) <= 0.03, `${file} tracks letters by ${match[1]}em`)
    }
    assert.ok(!/border-(?:left|right|inline-start|inline-end)\s*:\s*\d+px solid/.test(css), `${file} has a one-edge stripe`)
  }
})

test('motion only moves transform and opacity, and never uses transition: all', () => {
  for (const file of stylesheets) {
    const css = withoutComments(readText(file))
    assert.ok(!/transition\s*:\s*all\b/.test(css), `${file} uses transition: all`)
    for (const match of css.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)) {
      const properties = (match[1] ?? '')
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0] ?? '')
        .filter((name) => /^[a-z-]+$/.test(name) && !/^\d/.test(name))
      for (const property of properties) {
        assert.ok(['transform', 'opacity'].includes(property), `${file} transitions ${property}`)
      }
    }
    for (const match of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\}\s*\}/g)) {
      assert.ok(!/\b(?:width|height|top|left|right|bottom|margin|padding)\s*:/.test(match[1] ?? ''), `${file} animates layout`)
    }
  }
})

test('spacing in components comes from the scale: no raw length in padding, margin or gap (UI-02)', () => {
  for (const file of componentStyles) {
    const css = withoutComments(readText(file))
    for (const match of css.matchAll(/(?:^|[\s{;])(padding|margin|gap)(?:-[a-z-]+)?\s*:\s*([^;]+);/g)) {
      const value = match[2] ?? ''
      assert.ok(!/(?<![\w-])-?\d*\.?\d+(?:px|rem|em)\b/.test(value.replace(/var\([^)]*\)/g, '')), `${file}: ${match[0].trim()}`)
    }
  }
})

test('every interactive state has a visible focus ring that appears at once', () => {
  const base = withoutComments(readText('src/themes/base.css'))
  assert.match(base, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--color-focus\)/)
  assert.ok(!/outline[^;]*transition|transition[^;]*outline/.test(base))
  assert.match(base, /overflow-x:\s*clip/)
  assert.ok(!/100vw/.test(componentStyles.map(readText).join('\n')), 'a width of 100vw causes sideways scrolling')
})

test('reduced motion is honoured', () => {
  assert.match(readText('src/themes/base.css'), /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(readText('src/themes/motion.css'), /@media \(prefers-reduced-motion: reduce\)/)
})
