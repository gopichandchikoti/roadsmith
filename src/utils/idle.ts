const FALLBACK_DELAY_MS = 1500

/** Runs work when the browser has nothing better to do, so preparing the next screen never competes with the current one. */
export function whenIdle(work: () => void): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(work, { timeout: FALLBACK_DELAY_MS * 2 })
  else window.setTimeout(work, FALLBACK_DELAY_MS)
}
