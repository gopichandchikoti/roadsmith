import { useId } from 'react'
import type { Problem } from '../../@types/catalog'
import { content } from '../../content'
import { Link } from '../../routes/Link'
import { hrefs } from '../../routes/route'
import './QuickPicks.css'

/** A short row of the problems drivers most often stop for, each one tap from its answer. */
export function QuickPicks({ problems }: { problems: readonly Pick<Problem, 'id' | 'name'>[] }) {
  const headingId = useId()
  return (
    <section className="quick" aria-labelledby={headingId}>
      <h2 id={headingId} className="quick__title">
        {content.browse.quickPicks.heading}
      </h2>
      <ul className="quick__list">
        {problems.map((problem) => (
          <li key={problem.id}>
            <Link to={hrefs.fix(problem.id)} className="quick__chip">
              {problem.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
