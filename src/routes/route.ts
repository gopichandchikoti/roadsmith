import { normalizeQuery } from '../validators/text'

/** Every address the app answers. Anything else is `notFound`. */
export type Route =
  | { name: 'home'; query: string; category: string | null }
  | { name: 'diagnose'; symptom: string | null; option: number | null }
  | { name: 'fix'; id: string }
  | { name: 'privacy' }
  | { name: 'terms' }
  | { name: 'notFound' }

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG = 40
const OPTION_INDEX = /^\d{1,2}$/
const NOT_FOUND: Route = { name: 'notFound' }

const slugOrNull = (value: string | null | undefined): string | null =>
  value && value.length <= MAX_SLUG && SLUG.test(value) ? value : null

/**
 * Turns an address into a route. Every part of the address is untrusted: a slug is lowercase words joined by hyphens, an
 * answer number is one or two digits, and a search is cleaned of control characters and capped in length.
 */
export function parseRoute(pathname: string, search = ''): Route {
  const [first, second, third, ...rest] = pathname.split('/').filter((segment) => segment !== '')
  if (rest.length > 0) return NOT_FOUND
  if (first === undefined) {
    const params = new URLSearchParams(search)
    return { name: 'home', query: normalizeQuery(params.get('q') ?? ''), category: slugOrNull(params.get('category')) }
  }
  if (first === 'diagnose') {
    if (second === undefined) return { name: 'diagnose', symptom: null, option: null }
    const symptom = slugOrNull(second)
    if (!symptom) return NOT_FOUND
    if (third === undefined) return { name: 'diagnose', symptom, option: null }
    return OPTION_INDEX.test(third) ? { name: 'diagnose', symptom, option: Number(third) } : NOT_FOUND
  }
  if (first === 'fix' && second !== undefined && third === undefined) {
    const id = slugOrNull(second)
    return id ? { name: 'fix', id } : NOT_FOUND
  }
  if (first === 'privacy' && second === undefined) return { name: 'privacy' }
  if (first === 'terms' && second === undefined) return { name: 'terms' }
  return NOT_FOUND
}

/** The one place an address is written, so a link and the route it parses to cannot drift apart. */
export const hrefs = {
  home(options: { query?: string; category?: string | null } = {}): string {
    const params = new URLSearchParams()
    if (options.query) params.set('q', options.query)
    if (options.category) params.set('category', options.category)
    const search = params.toString()
    return search ? `/?${search}` : '/'
  },
  diagnose(symptom?: string, option?: number): string {
    if (!symptom) return '/diagnose'
    return option === undefined ? `/diagnose/${symptom}` : `/diagnose/${symptom}/${option}`
  },
  fix: (id: string): string => `/fix/${id}`,
  privacy: '/privacy',
  terms: '/terms',
} as const
