import { useId } from 'react'
import type { Verdict } from '../../@types/catalog'
import { content } from '../../content'
import './StepList.css'

type StepListProps = {
  verdict: Verdict
  steps: readonly string[]
}

/** The steps, in order. For a problem that needs help the heading says these are for while the driver waits. */
export function StepList({ verdict, steps }: StepListProps) {
  const headingId = useId()
  return (
    <section className="panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="panel__title">
        {content.fix.stepsHeading[verdict]}
      </h2>
      <ol className="steps">
        {steps.map((step) => (
          <li key={step} className="steps__item">
            {step}
          </li>
        ))}
      </ol>
    </section>
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
