import assert from 'node:assert/strict'
import test from 'node:test'
import { SPRINGS, springEasing, type SpringName } from '../../src/utils/spring'
import { readText } from '../setup/data'

const css = readText('src/themes/motion.css')

test('motion.css carries the three named springs exactly as src/utils/spring.ts computes them', () => {
  const names = Object.keys(SPRINGS) as SpringName[]
  assert.deepEqual(names, ['snappy', 'smooth', 'bouncy'])
  for (const name of names) {
    const { easing, durationMs } = springEasing(SPRINGS[name])
    assert.ok(css.includes(`--spring-${name}: ${easing};`), `--spring-${name} is out of date: run pnpm motion:generate`)
    assert.ok(css.includes(`--spring-${name}-time: ${durationMs}ms;`), `--spring-${name}-time is out of date`)
  }
})

test('each spring has a cubic-bezier fallback for a browser without linear()', () => {
  assert.match(css, /@supports not \(transition-timing-function: linear\(0, 1\)\)/)
  for (const name of Object.keys(SPRINGS)) assert.match(css, new RegExp(`--spring-${name}: cubic-bezier`))
})

test('the spring values are the three the standard names', () => {
  assert.deepEqual(SPRINGS.snappy, { response: 0.32, dampingFraction: 0.86 })
  assert.deepEqual(SPRINGS.smooth, { response: 0.5, dampingFraction: 1 })
  assert.deepEqual(SPRINGS.bouncy, { response: 0.45, dampingFraction: 0.7 })
})
