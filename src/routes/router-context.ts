import { createContext, useContext } from 'react'
import type { Route } from './route'

export type NavigateOptions = {
  /** Replace the current entry instead of adding one, for state such as a search that should not fill the Back list. */
  replace?: boolean
}

export type RouterValue = {
  route: Route
  /** How many times the address has changed since the page loaded. Zero means the first screen. */
  navigationCount: number
  navigate: (href: string, options?: NavigateOptions) => void
  /** Goes back one entry when this visit has one inside the app, otherwise to the fallback address. */
  back: (fallbackHref: string) => void
}

export const RouterContext = createContext<RouterValue | null>(null)

export function useRouter(): RouterValue {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRouter must be used inside RouterProvider')
  return value
}
