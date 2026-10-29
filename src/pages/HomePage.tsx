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
 * The way in: the choice between naming the problem or answering questions, and the panel for that choice. The optional vehicle
 * box is handed to the panel, which puts it just under the hero so the search stays near the top of a phone screen. It is one
 * centred column at every width, the same as the Help screen, so nothing sits beside an empty half.
 */
export function HomePage({ route }: HomePageProps) {
  return (
    <div className="home">
      <HazardNote />
      <ModeSwitch active={route.name === 'home' ? 'browse' : 'diagnose'} />
      <div className="home__panel">
        {route.name === 'home' ? (
          <BrowsePanel query={route.query} category={route.category} vehicleField={<VehicleField />} />
        ) : (
          <ChunkBoundary>
            <Suspense fallback={<ListSkeleton />}>
              <DiagnosePanel symptom={route.symptom} option={route.option} vehicleField={<VehicleField />} />
            </Suspense>
          </ChunkBoundary>
        )}
      </div>
    </div>
  )
}
