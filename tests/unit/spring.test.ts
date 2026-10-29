import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fromDurationAndBounce,
  SPRINGS,
  settlingTime,
  springConstants,
  springEasing,
  springPosition,
} from '../../src/utils/spring'

test('a spring starts at rest and arrives at its target', () => {
  for (const spec of Object.values(SPRINGS)) {
    assert.equal(springPosition(spec, 0), 0)
    assert.ok(Math.abs(springPosition(spec, 5) - 1) < 1e-6)
  }
})

test('smooth never overshoots, snappy and bouncy do, and bouncy overshoots most', () => {
  const peak = (spec: (typeof SPRINGS)[keyof typeof SPRINGS]) =>
    Math.max(...Array.from({ length: 400 }, (_, index) => springPosition(spec, index * 0.005)))
  assert.ok(peak(SPRINGS.smooth) <= 1)
  assert.ok(peak(SPRINGS.snappy) > 1)
  assert.ok(peak(SPRINGS.bouncy) > peak(SPRINGS.snappy))
})

test('physical constants follow the response and damping fraction (mass 1)', () => {
  const { stiffness, damping, mass } = springConstants({ response: 0.5, dampingFraction: 1 })
  assert.equal(mass, 1)
  assert.ok(Math.abs(stiffness - (2 * Math.PI) ** 2 / 0.25) < 1e-9)
  assert.ok(Math.abs(damping - 4 * Math.PI * 2) < 1e-9)
})

test('SwiftUI duration and bounce map to response and damping fraction', () => {
  assert.deepEqual(fromDurationAndBounce(0.5, 0), { response: 0.5, dampingFraction: 1 })
  assert.deepEqual(fromDurationAndBounce(0.45, 0.3), { response: 0.45, dampingFraction: 0.7 })
  assert.equal(fromDurationAndBounce(0.4, 3).dampingFraction, 0)
})

test('a CSS linear() easing ends exactly at 1 and lasts as long as the spring takes to settle', () => {
  const { easing, durationMs } = springEasing(SPRINGS.bouncy)
  assert.match(easing, /^linear\(0, .*, 1\)$/)
  assert.equal(durationMs, Math.round(settlingTime(SPRINGS.bouncy) * 1000))
})
