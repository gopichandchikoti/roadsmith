import type { Problem } from '../@types/catalog'
import { Link } from '../routes/Link'
import { hrefs } from '../routes/route'
import { Icon } from './Icon'
import { ForwardIcon } from './icons'
import { VerdictBadge } from './VerdictBadge'
import './RowLink.css'

/** One problem in a list: its name, its verdict, and a link to the result. */
export function ProblemRow({ problem }: { problem: Pick<Problem, 'id' | 'name' | 'verdict'> }) {
  return (
    <li>
      <Link to={hrefs.fix(problem.id)} className="row-link">
        <span className="row-link__text">
          <span className="row-link__name">{problem.name}</span>
          <VerdictBadge verdict={problem.verdict} />
        </span>
        <Icon as={ForwardIcon} />
      </Link>
    </li>
  )
}
