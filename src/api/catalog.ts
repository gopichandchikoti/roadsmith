import type { Catalog } from '../@types/catalog'

/** Where the catalog comes from. It is injected so a test can make the load slow or fail (CODE-08). */
export type CatalogSource = () => Promise<Catalog>

const bundledCatalog: CatalogSource = () => import('./catalog-file').then((module) => module.bundledCatalog)

let source: CatalogSource = bundledCatalog
let loaded: Catalog | null = null
let pending: Promise<Catalog> | null = null

/** The catalog if it has already arrived, so a screen can draw at once instead of showing a loading state again. */
export const peekCatalog = (): Catalog | null => loaded

/**
 * Loads the problem catalog once per visit. The file is its own hashed chunk, so the browser keeps it for a year; every
 * caller shares one request, and a failed request is forgotten so a retry really tries again.
 */
export function loadCatalog(): Promise<Catalog> {
  pending ??= source()
    .then((catalog) => {
      loaded = catalog
      return catalog
    })
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

/** Replaces the catalog source and forgets what was loaded. For tests only. */
export function setCatalogSource(next: CatalogSource): void {
  source = next
  loaded = null
  pending = null
}

/** Puts the real catalog back and forgets what was loaded. For tests only. */
export function resetCatalogCache(): void {
  setCatalogSource(bundledCatalog)
}
