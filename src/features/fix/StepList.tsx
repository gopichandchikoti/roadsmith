import { useId } from 'react'
import type { Verdict } from '../../@types/catalog'
import { TickList } from '../../components/TickList'
import { content } from '../../content'
import './StepList.css'

type StepListProps = {
  problemId: string
  verdict: Verdict
  steps: readonly string[]
}

/**
 * The steps, in order, each one tickable, with the next one marked. For a problem that needs help the heading says these are for
 * while the driver waits.
 */
export function StepList({ problemId, verdict, steps }: StepListProps) {
  return (
    <TickList
      numbered
      heading={content.fix.stepsHeading[verdict]}
      items={steps}
      storageKey={`roadsmith:steps:${problemId}`}
      progressTemplate={content.fix.stepsProgress}
      doneMessage={content.fix.stepsDone}
    />
  )
}

/** The limit past which the driver should stop trying and call for help, in the catalog's own words. */
export function StopPanel({ stopIf }: { stopIf: string }) {
  const headingId = useId()
  return (
    <section className="stop-panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="stop-panel__title">
        {content.fix.stopHeading}
      </h2>
      <p>{stopIf}</p>
    </section>
  )
}
