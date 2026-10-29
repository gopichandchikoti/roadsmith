import { useId } from 'react'
import '../../components/Panel.css'
import { content } from '../../content'

/** The standing highway safety reminders, shown on every result. */
export function HighwayPanel() {
  const headingId = useId()
  return (
    <section className="panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="panel__title">
        {content.fix.highway.heading}
      </h2>
      <ul className="panel__list">
        {content.fix.highway.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
