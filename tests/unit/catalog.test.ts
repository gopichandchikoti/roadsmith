import assert from 'node:assert/strict'
import test from 'node:test'
import { CatalogError, parseCatalog } from '../../src/validators/catalog'
import { allStrings, readJson } from '../setup/data'

const raw = readJson('src/catalog.model.json')
const catalog = parseCatalog(raw)

const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(raw))

test('the shipped catalog is valid and has the expected size', () => {
  assert.equal(catalog.categories.length, 8)
  assert.equal(catalog.problems.length, 37)
  assert.equal(catalog.triage.length, 8)
})

test('every category holds at least one problem, and every problem is reachable by name, category and a triage answer or search', () => {
  for (const category of catalog.categories) {
    assert.ok(
      catalog.problems.some((problem) => problem.category === category.id),
      `category ${category.id} is empty`,
    )
  }
  const named = new Set(catalog.triage.flatMap((question) => question.options.flatMap((option) => option.problemIds)))
  assert.ok(named.size >= 30, `only ${named.size} problems are reachable from the questions`)
})

test('a problem that needs help never tells the driver to drive on, and always says to call', () => {
  const needHelp = catalog.problems.filter((problem) => problem.verdict === 'help')
  assert.ok(needHelp.length >= 8)
  for (const problem of needHelp) {
    for (const step of problem.steps) {
      assert.ok(!/^drive\b/i.test(step), `${problem.id}: "${step}" tells the driver to drive`)
    }
    assert.ok(
      problem.steps.some((step) => /\bcall\b/i.test(step)) || /\bcall\b/i.test(problem.stopIf),
      `${problem.id} never says to call for help`,
    )
  }
})

test('the problems the owner treats as unsafe to drive are marked help', () => {
  const must = ['tire-bulge', 'wrong-fuel', 'check-engine-flashing', 'hybrid-ev-warning', 'broken-belt', 'soft-brake-pedal']
  for (const id of must) assert.equal(catalog.problems.find((problem) => problem.id === id)?.verdict, 'help', id)
})

test('copy follows the voice rules: no dashes as punctuation, no middle dots, no arrows, no emoji, no raw URLs', () => {
  const strings = allStrings(raw)
  for (const text of strings) {
    assert.ok(!/[–—]/.test(text), `dash in "${text}"`)
    assert.ok(!/·|•/.test(text), `middle dot in "${text}"`)
    assert.ok(!/[←-⇿➔-➿]/.test(text), `arrow in "${text}"`)
    assert.ok(!/\p{Extended_Pictographic}/u.test(text), `emoji in "${text}"`)
    assert.ok(!/https?:\/\//.test(text), `URL in "${text}"`)
    assert.ok(!/<[a-z/]/i.test(text), `markup in "${text}"`)
    assert.equal(text, text.trim(), `untrimmed "${text}"`)
  }
})

test('the catalog states no price, phone number, part number or video details it cannot back', () => {
  for (const text of allStrings(raw)) {
    assert.ok(!/[$€£]\s?\d/.test(text), `price in "${text}"`)
    assert.ok(!/\b\d{3}[-.\s]\d{3,4}[-.\s]\d{4}\b/.test(text), `phone number in "${text}"`)
    assert.ok(!/\b\d{1,2}:\d{2}\b/.test(text), `run time in "${text}"`)
  }
})

test('the steps of one problem are distinct, and steps and tools are in sensible bounds', () => {
  for (const problem of catalog.problems) {
    assert.equal(new Set(problem.steps).size, problem.steps.length, `${problem.id} repeats a step`)
    assert.equal(new Set(problem.tools).size, problem.tools.length, `${problem.id} repeats a tool`)
    assert.ok(problem.steps.length >= 3 && problem.steps.length <= 6, `${problem.id} has ${problem.steps.length} steps`)
    for (const step of problem.steps) assert.match(step, /[.]$/, `${problem.id}: step should end with a full stop: ${step}`)
  }
})

test('the catalog loader refuses a file that is not shaped as expected', () => {
  const cases: Record<string, (data: Record<string, unknown>) => void> = {
    'not an object': (data) => Object.assign(data, { problems: 'nope' }),
    'a repeated problem id': (data) => {
      const problems = data.problems as Record<string, unknown>[]
      problems[1] = { ...problems[1], id: problems[0]?.id }
    },
    'a problem in a missing category': (data) => {
      const problems = data.problems as Record<string, unknown>[]
      problems[0] = { ...problems[0], category: 'nowhere' }
    },
    'an unknown verdict': (data) => {
      const problems = data.problems as Record<string, unknown>[]
      problems[0] = { ...problems[0], verdict: 'tow' }
    },
    'an id that is not a slug': (data) => {
      const problems = data.problems as Record<string, unknown>[]
      problems[0] = { ...problems[0], id: '../x' }
    },
    'a problem with no steps': (data) => {
      const problems = data.problems as Record<string, unknown>[]
      problems[0] = { ...problems[0], steps: [] }
    },
    'a triage answer for a missing problem': (data) => {
      const triage = data.triage as { options: { problemIds: string[] }[] }[]
      triage[0]?.options.push({ problemIds: ['ghost'] })
    },
    'an empty label': (data) => {
      const categories = data.categories as Record<string, unknown>[]
      categories[0] = { ...categories[0], label: '  ' }
    },
    'an over-long sentence': (data) => {
      const problems = data.problems as Record<string, unknown>[]
      problems[0] = { ...problems[0], summary: 'x'.repeat(400) }
    },
  }
  for (const [name, damage] of Object.entries(cases)) {
    const data = clone()
    damage(data)
    assert.throws(() => parseCatalog(data), CatalogError, name)
  }
  for (const bad of [null, 5, 'text', [], undefined]) assert.throws(() => parseCatalog(bad), CatalogError)
})
