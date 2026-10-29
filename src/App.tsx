import { lazy, Suspense, type ReactNode } from 'react'
import { ChunkBoundary } from './components/ChunkBoundary'
import { ListSkeleton } from './components/ListSkeleton'
import { HomePage } from './pages/HomePage'
import type { Route } from './routes/route'
import { useRouter } from './routes/router-context'
import { AppShell } from './templates/AppShell'

// Only the first screen is in the main file. The others are their own files, fetched when needed and prefetched when idle
// (see routes/prefetch), so the first load stays small on a weak signal.
const FixPage = lazy(() => import('./pages/FixPage').then((module) => ({ default: module.FixPage })))
const LegalPage = lazy(() => import('./pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function renderRoute(route: Route): ReactNode {
  switch (route.name) {
    case 'home':
    case 'diagnose':
      return <HomePage route={route} />
    case 'fix':
      return <FixPage id={route.id} />
    case 'privacy':
      return <LegalPage document="privacy" />
    case 'terms':
      return <LegalPage document="terms" />
    case 'notFound':
      return <NotFoundPage />
  }
}

/** The app: the frame, and the screen for the current address. */
export function App() {
  const { route } = useRouter()
  return (
    <AppShell>
      <ChunkBoundary key={route.name}>
        <Suspense fallback={<ListSkeleton />}>{renderRoute(route)}</Suspense>
      </ChunkBoundary>
    </AppShell>
  )
}
