import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_NOTE_LENGTH,
  MAX_QUERY_LENGTH,
  MAX_VEHICLE_LENGTH,
  normalizeNote,
  normalizeQuery,
  normalizeVehicle,
  parseCheckedItems,
  parseThemeChoice,
  serializeCheckedItems,
} from '../../src/validators/text'

test('a vehicle keeps letters, digits and the marks a name uses', () => {
  assert.equal(normalizeVehicle('2019 Toyota Camry'), '2019 Toyota Camry')
  assert.equal(normalizeVehicle('  Citroën   2CV '), 'Citroën 2CV')
  assert.equal(normalizeVehicle('Ford F-150 (XLT)'), 'Ford F-150 XLT')
  assert.equal(normalizeVehicle('Mercedes-Benz C/E & "AMG"'), 'Mercedes-Benz C/E & AMG')
})

test('a vehicle drops markup, control characters and anything that could change a link', () => {
  assert.equal(normalizeVehicle('<img src=x onerror=alert(1)>'), 'img srcx onerroralert1')
  assert.equal(normalizeVehicle('a\u0000b‮c\n\td'), 'abc d')
  assert.equal(normalizeVehicle('https://evil.example/?a=b#c'), 'https//evil.example/abc')
  assert.ok(!/[:?#=%;"<>\\]/.test(normalizeVehicle('https://evil.example/?a=b#c%00;"<>\\')))
})

test('a vehicle is capped in length', () => {
  assert.equal(normalizeVehicle('x'.repeat(500)).length, MAX_VEHICLE_LENGTH)
  assert.equal(normalizeVehicle(''), '')
  assert.equal(normalizeVehicle('   '), '')
})

test('a search is cleaned of control characters and brackets, collapsed and capped', () => {
  assert.equal(normalizeQuery('  flat   tire '), 'flat tire')
  assert.equal(normalizeQuery('a\u0000b'), 'a b')
  assert.equal(normalizeQuery('<b>x</b>'), 'b x /b')
  assert.equal(normalizeQuery('y'.repeat(500)).length, MAX_QUERY_LENGTH)
})

test('the note on the Help screen is cleaned of control characters and brackets, collapsed and capped', () => {
  assert.equal(normalizeNote('  flat   tire\non the left  '), 'flat tire on the left')
  assert.equal(normalizeNote('<script>alert(1)</script>'), 'script alert(1) /script')
  // A control character, a bracket and a zero width character each become a space and are collapsed.
  assert.equal(normalizeNote('a\u0000b<c>\u001fd​e'), 'a b c d e')
  assert.equal(normalizeNote('x'.repeat(500)).length, MAX_NOTE_LENGTH)
  assert.equal(normalizeNote(''), '')
  assert.equal(normalizeNote('   '), '')
  // A note keeps the punctuation a sentence needs, unlike a vehicle name.
  assert.equal(normalizeNote("It's making a grinding noise, again."), "It's making a grinding noise, again.")
})

test('only the three theme names are accepted from storage', () => {
  assert.equal(parseThemeChoice('light'), 'light')
  assert.equal(parseThemeChoice('dark'), 'dark')
  assert.equal(parseThemeChoice('system'), 'system')
  for (const bad of [null, '', 'Dark', 'blue', '<script>', 'light ']) assert.equal(parseThemeChoice(bad), null)
})

test('stored checklist ticks are read back as small distinct numbers inside the list', () => {
  assert.deepEqual(parseCheckedItems('0,2,3', 6), [0, 2, 3])
  assert.deepEqual(parseCheckedItems('3,1,1,2', 6), [1, 2, 3])
  assert.deepEqual(parseCheckedItems('0,9,2', 4), [0, 2])
  assert.deepEqual(parseCheckedItems('a,-1,1.5,100,<x>', 6), [])
  assert.deepEqual(parseCheckedItems(null, 6), [])
  assert.deepEqual(parseCheckedItems('', 6), [])
  assert.equal(serializeCheckedItems([3, 1, 2]), '1,2,3')
})
