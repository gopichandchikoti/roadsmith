import { SKILLS, VERDICTS, type Catalog, type Category, type Problem, type TriageQuestion } from '../@types/catalog'

/** The catalog file is not shaped as the app expects. The message names the field, for the developer, never the visitor. */
export class CatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CatalogError'
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG = 40
const MAX_LABEL = 80
const MAX_SENTENCE = 260
const MAX_LIST_ITEM = 220

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function record(value: unknown, where: string): Record<string, unknown> {
  if (!isRecord(value)) throw new CatalogError(`${where} must be an object`)
  return value
}

function array(value: unknown, where: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new CatalogError(`${where} must be a list of ${min} to ${max} items`)
  }
  return value
}

function text(value: unknown, where: string, max: number): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) {
    throw new CatalogError(`${where} must be text of 1 to ${max} characters`)
  }
  return value
}

function slug(value: unknown, where: string): string {
  const id = text(value, where, MAX_SLUG)
  if (!SLUG.test(id)) throw new CatalogError(`${where} must be lowercase words joined by hyphens`)
  return id
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], where: string): T {
  const found = allowed.find((candidate) => candidate === value)
  if (found === undefined) throw new CatalogError(`${where} must be one of ${allowed.join(', ')}`)
  return found
}

function textList(value: unknown, where: string, min: number, max: number, itemMax: number): string[] {
  return array(value, where, min, max).map((item, index) => text(item, `${where}[${index}]`, itemMax))
}

function parseCategory(raw: unknown, index: number): Category {
  const where = `categories[${index}]`
  const item = record(raw, where)
  return { id: slug(item.id, `${where}.id`), label: text(item.label, `${where}.label`, MAX_LABEL) }
}

function parseProblem(raw: unknown, index: number, categoryIds: ReadonlySet<string>): Problem {
  const where = `problems[${index}]`
  const item = record(raw, where)
  const category = slug(item.category, `${where}.category`)
  if (!categoryIds.has(category)) throw new CatalogError(`${where}.category names a category that does not exist`)
  return {
    id: slug(item.id, `${where}.id`),
    category,
    name: text(item.name, `${where}.name`, MAX_LABEL),
    verdict: oneOf(item.verdict, VERDICTS, `${where}.verdict`),
    skill: oneOf(item.skill, SKILLS, `${where}.skill`),
    time: text(item.time, `${where}.time`, MAX_LABEL),
    summary: text(item.summary, `${where}.summary`, MAX_SENTENCE),
    tools: textList(item.tools, `${where}.tools`, 1, 8, MAX_LIST_ITEM),
    steps: textList(item.steps, `${where}.steps`, 3, 8, MAX_SENTENCE),
    videoQuery: text(item.videoQuery, `${where}.videoQuery`, MAX_LABEL),
    stopIf: text(item.stopIf, `${where}.stopIf`, MAX_SENTENCE),
    keywords: textList(item.keywords, `${where}.keywords`, 0, 12, MAX_LABEL),
  }
}

function parseTriage(raw: unknown, index: number, problemIds: ReadonlySet<string>): TriageQuestion {
  const where = `triage[${index}]`
  const item = record(raw, where)
  const options = array(item.options, `${where}.options`, 2, 10).map((rawOption, optionIndex) => {
    const optionWhere = `${where}.options[${optionIndex}]`
    const option = record(rawOption, optionWhere)
    const ids = array(option.problemIds, `${optionWhere}.problemIds`, 1, 4).map((id, idIndex) =>
      slug(id, `${optionWhere}.problemIds[${idIndex}]`),
    )
    for (const id of ids) {
      if (!problemIds.has(id)) throw new CatalogError(`${optionWhere} names a problem that does not exist`)
    }
    return { label: text(option.label, `${optionWhere}.label`, MAX_LABEL), problemIds: ids }
  })
  return {
    id: slug(item.id, `${where}.id`),
    label: text(item.label, `${where}.label`, MAX_LABEL),
    question: text(item.question, `${where}.question`, MAX_SENTENCE),
    options,
  }
}

function assertUnique(ids: string[], where: string): void {
  if (new Set(ids).size !== ids.length) throw new CatalogError(`${where} has a repeated id`)
}

/**
 * Checks the catalog file at the boundary and returns it with real types, so no part of the app casts it. A problem that
 * names a missing category, or a triage answer that names a missing problem, fails here instead of on a driver's screen.
 */
export function parseCatalog(raw: unknown): Catalog {
  const root = record(raw, 'catalog')
  const categories = array(root.categories, 'categories', 1, 20).map(parseCategory)
  assertUnique(
    categories.map((category) => category.id),
    'categories',
  )
  const categoryIds = new Set(categories.map((category) => category.id))
  const problems = array(root.problems, 'problems', 1, 200).map((item, index) => parseProblem(item, index, categoryIds))
  assertUnique(
    problems.map((problem) => problem.id),
    'problems',
  )
  const problemIds = new Set(problems.map((problem) => problem.id))
  const triage = array(root.triage, 'triage', 1, 20).map((item, index) => parseTriage(item, index, problemIds))
  assertUnique(
    triage.map((question) => question.id),
    'triage',
  )
  return { categories, problems, triage }
}
