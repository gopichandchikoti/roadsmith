/**
 * The only code that builds an address leaving the app. Both shapes are search pages on a fixed host, filled with
 * `URLSearchParams`, so the driver's text can never change where the link goes.
 */
const YOUTUBE_RESULTS = 'https://www.youtube.com/results'
const MAPS_SEARCH = 'https://www.google.com/maps/search/'

/** Every host a link can reach. A test holds this list to the two builders below. */
export const EXTERNAL_HOSTS = ['www.youtube.com', 'www.google.com'] as const

/** A YouTube search for tutorials about a problem, narrowed by the vehicle when the driver gave one. */
export function tutorialSearchUrl(vehicle: string, videoQuery: string): string {
  const url = new URL(YOUTUBE_RESULTS)
  url.searchParams.set('search_query', `${vehicle} ${videoQuery}`.trim())
  return url.toString()
}

/** A Google Maps search such as "auto parts store near me". Maps asks the driver for a location itself. */
export function mapsSearchUrl(query: string): string {
  const url = new URL(MAPS_SEARCH)
  url.searchParams.set('api', '1')
  url.searchParams.set('query', query)
  return url.toString()
}
