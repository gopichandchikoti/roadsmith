import assert from 'node:assert/strict'
import test from 'node:test'
import { fill } from '../../src/utils/format'
import { allStrings, at, readJson } from '../setup/data'

const model = readJson('src/content.model.json')
const legal = readJson('src/legal.model.json')
const everyString = [...allStrings(model), ...allStrings(legal)]

test('every visible string follows the voice rules: no dashes, middle dots, arrows, emoji, markup or addresses', () => {
  assert.ok(everyString.length > 100)
  for (const text of everyString) {
    assert.ok(!/[–—]/.test(text), `dash in "${text}"`)
    assert.ok(!/·|•/.test(text), `middle dot in "${text}"`)
    assert.ok(!/[←-⇿➔-➿]/.test(text), `arrow in "${text}"`)
    assert.ok(!/\p{Extended_Pictographic}/u.test(text), `emoji in "${text}"`)
    assert.ok(!/<[a-z/]/i.test(text), `markup in "${text}"`)
    assert.ok(!/https?:\/\//.test(text), `address in "${text}"`)
    assert.equal(text, text.trim(), `untrimmed "${text}"`)
  }
})

test('the copy uses none of the marketing words the standard refuses', () => {
  const banned =
    /\b(seamless|robust|empower|supercharge|elevate|effortless|unlock|unleash|next-generation|world-class|best-in-class|industry-leading|mission-critical|future-proof|revolutionary|cutting-edge)\b/i
  for (const text of everyString) assert.ok(!banned.test(text), `"${text}"`)
})

test('the legal pages say what the code does, in the places a test elsewhere proves', () => {
  const privacy = allStrings(at(legal, 'privacy')).join(' ')
  assert.match(privacy, /no accounts/i)
  assert.match(privacy, /sets no cookies/i)
  assert.match(privacy, /loads nothing from other sites/i)
  assert.match(privacy, /no analytics, no advertising and no tracking/i)
  assert.match(privacy, /None of it is sent to the Roadsmith server/i)
  const terms = allStrings(at(legal, 'terms')).join(' ')
  assert.match(terms, /not a mechanic/i)
  assert.match(terms, /emergency number/i)
})

test('placeholders are filled, and a missing value is left visible rather than hidden', () => {
  assert.equal(fill('{done} of {total} ready', { done: 2, total: 6 }), '2 of 6 ready')
  assert.equal(fill('For your {vehicle}', { vehicle: 'Camry' }), 'For your Camry')
  assert.equal(fill('Hello {name}', {}), 'Hello {name}')
})

test('the document metadata used by index.html is present', () => {
  assert.equal(at(model, 'locale'), 'en')
  for (const key of ['title', 'description', 'titleSuffix', 'noscript']) {
    const value = at(model, 'document', key)
    assert.ok(typeof value === 'string' && value.length >= 8, key)
  }
})
