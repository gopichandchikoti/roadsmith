import { lazy, Suspense } from 'react'
import { ChunkBoundary } from '../components/ChunkBoundary'
import { HazardNote } from '../components/HazardNote'
import { ListSkeleton } from '../components/ListSkeleton'
import { ModeSwitch } from '../components/ModeSwitch'
import { BrowsePanel } from '../features/browse/BrowsePanel'
import { VehicleField } from '../features/preferences/VehicleField'
import type { Route } from '../routes/route'
import './HomePage.css'

const DiagnosePanel = lazy(() =>
  import('../features/diagnose/DiagnosePanel').then((module) => ({ default: module.DiagnosePanel })),
)

type HomePageProps = {
  route: Extract<Route, { name: 'home' | 'diagnose' }>
}

/**
 * The way in: the vehicle, the choice between naming the problem or answering questions, and the panel for that choice.
 * On a wide screen the vehicle and the choice sit in a rail beside the panel; on a phone they stack above it.
 */
export function HomePage({ route }: HomePageProps) {
  return (
    <div className="home">
      <HazardNote />
      <div className="home__rail">
        <VehicleField />
        <ModeSwitch active={route.name === 'home' ? 'browse' : 'diagnose'} />
      </div>
      <div className="home__panel">
        {route.name === 'home' ? (
          <BrowsePanel query={route.query} category={route.category} />
        ) : (
          <ChunkBoundary>
            <Suspense fallback={<ListSkeleton />}>
              <DiagnosePanel symptom={route.symptom} option={route.option} />
            </Suspense>
          </ChunkBoundary>
        )}
      </div>
    </div>
  )
}
