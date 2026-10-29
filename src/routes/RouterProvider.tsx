import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { parseRoute } from './route'
import { RouterContext, type NavigateOptions, type RouterValue } from './router-context'

type Location = { pathname: string; search: string }

const readLocation = (): Location => ({ pathname: window.location.pathname, search: window.location.search })

/** How deep this visit is inside the app, kept in the history entry so Back can tell the app's own entries from outside ones. */
const entryDepth = (): number => {
  const state: unknown = window.history.state
  if (typeof state === 'object' && state !== null && 'depth' in state && typeof state.depth === 'number') return state.depth
  return 0
}

/**
 * Routing on the History API: links change the address without a reload, Back and Forward work, and a shared address
 * opens the same screen. Only addresses on this origin are followed.
 */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(readLocation)
  const [navigationCount, setNavigationCount] = useState(0)

  useEffect(() => {
    const onPopState = () => {
      setLocation(readLocation())
      setNavigationCount((count) => count + 1)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((href: string, options: NavigateOptions = {}) => {
    const target = new URL(href, window.location.origin)
    if (target.origin !== window.location.origin) return
    const address = `${target.pathname}${target.search}`
    if (options.replace) {
      window.history.replaceState({ depth: entryDepth() }, '', address)
    } else {
      window.history.pushState({ depth: entryDepth() + 1 }, '', address)
      window.scrollTo(0, 0)
    }
    setLocation(readLocation())
    setNavigationCount((count) => count + 1)
  }, [])

  const back = useCallback(
    (fallbackHref: string) => {
      if (entryDepth() > 0) window.history.back()
      else navigate(fallbackHref)
    },
    [navigate],
  )

  const value = useMemo<RouterValue>(
    () => ({ route: parseRoute(location.pathname, location.search), navigationCount, navigate, back }),
    [location, navigationCount, navigate, back],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
