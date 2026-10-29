import { useEffect, useState } from 'react'
import type { Catalog } from '../@types/catalog'
import { loadCatalog, peekCatalog } from '../api'

export type CatalogState = { status: 'loading' } | { status: 'ready'; catalog: Catalog } | { status: 'error' }

type Outcome = { attempt: number; state: CatalogState }

/**
 * The problem catalog for a screen: loading, ready or failed, with a retry. A catalog already loaded is ready at once, so a
 * second screen never shows a loading state again. The state is worked out while rendering from what the request last
 * reported and the attempt number, so no effect has to set state in step with another value.
 */
export function useCatalog(): { state: CatalogState; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    let current = true
    loadCatalog().then(
      (catalog) => {
        if (current) setOutcome({ attempt, state: { status: 'ready', catalog } })
      },
      () => {
        if (current) setOutcome({ attempt, state: { status: 'error' } })
      },
    )
    return () => {
      current = false
    }
  }, [attempt])

  const loaded = peekCatalog()
  let state: CatalogState = { status: 'loading' }
  if (outcome?.attempt === attempt) state = outcome.state
  else if (loaded) state = { status: 'ready', catalog: loaded }

  return { state, retry: () => setAttempt((count) => count + 1) }
}
