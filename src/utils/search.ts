import type { Problem } from '../@types/catalog'

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

/**
 * Problems that match every word of the search and the chosen category, with name matches first and the catalog's own
 * order kept inside each group. With no search words the category alone decides.
 */
export function searchProblems(problems: readonly Problem[], query: string, category: string | null): Problem[] {
  const wanted = words(query)
  const inCategory = category ? problems.filter((problem) => problem.category === category) : [...problems]
  if (wanted.length === 0) return inCategory
  const matches = inCategory.flatMap((problem) => {
    const name = problem.name.toLowerCase()
    const haystack = `${name} ${problem.summary.toLowerCase()} ${problem.keywords.join(' ').toLowerCase()}`
    return wanted.every((word) => haystack.includes(word))
      ? [{ problem, inName: wanted.every((word) => name.includes(word)) }]
      : []
  })
  return [...matches.filter((match) => match.inName), ...matches.filter((match) => !match.inName)].map((match) => match.problem)
}
