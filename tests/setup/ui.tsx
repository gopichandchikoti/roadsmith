import type { Catalog } from '../../src/@types/catalog'
import { parseCatalog } from '../../src/validators/catalog'
import { installDom, type BrowserState } from './dom'

type Rtl = typeof import('@testing-library/react')

export type Mounted = {
  rtl: Rtl
  screen: Rtl['screen']
}

/**
 * Renders the whole app, with the real router and preferences, at an address and with the given browser storage. The page,
 * the testing library and the app are loaded in that order, because each finds `document` when it first loads.
 */
export async function mountApp(path = '/', state: BrowserState = {}): Promise<Mounted> {
  installDom(path, state)
  const rtl = await import('@testing-library/react')
  rtl.cleanup()
  const { App } = await import('../../src/App')
  const { RouterProvider } = await import('../../src/routes/RouterProvider')
  const { PreferencesProvider } = await import('../../src/features/preferences/PreferencesProvider')
  rtl.render(
    <RouterProvider>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </RouterProvider>,
  )
  return { rtl, screen: rtl.screen }
}

/** The real catalog file, checked the way the app checks it, as a catalog source for the loader. */
export async function realCatalogSource(): Promise<Catalog> {
  const { readJson } = await import('./data')
  return parseCatalog(readJson('src/catalog.model.json'))
}
