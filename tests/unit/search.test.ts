import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCatalog } from '../../src/validators/catalog'
import { searchProblems } from '../../src/utils/search'
import { readJson } from '../setup/data'

const { problems } = parseCatalog(readJson('src/catalog.model.json'))
const ids = (found: readonly { id: string }[]) => found.map((problem) => problem.id)

test('no words and no category returns every problem in catalog order', () => {
  assert.deepEqual(ids(searchProblems(problems, '', null)), ids(problems))
})

test('a category narrows the list', () => {
  const tires = searchProblems(problems, '', 'tires')
  assert.ok(tires.length > 0)
  assert.ok(tires.every((problem) => problem.category === 'tires'))
})

test('every word must match, in any order, in any letter case', () => {
  assert.ok(ids(searchProblems(problems, 'TIRE flat', null)).includes('flat-tire'))
  assert.deepEqual(ids(searchProblems(problems, 'flat zzzz', null)), [])
})

test('a word people use but the name does not still finds the problem', () => {
  assert.ok(ids(searchProblems(problems, 'puncture', null)).includes('flat-tire'))
  assert.ok(ids(searchProblems(problems, 'jump start', null)).includes('dead-battery'))
  assert.ok(ids(searchProblems(problems, 'deer', null)).includes('animal-strike'))
})

test('a match in the name comes before a match only in the description', () => {
  const found = ids(searchProblems(problems, 'battery', null))
  assert.ok(found.indexOf('dead-battery') < found.indexOf('failing-alternator'))
})

test('a search and a category combine, and punctuation does not break the search', () => {
  assert.deepEqual(ids(searchProblems(problems, 'battery', 'weather')), [])
  assert.ok(ids(searchProblems(problems, 'flat, tire!', null)).includes('flat-tire'))
})
