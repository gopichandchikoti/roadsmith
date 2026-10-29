import { Link } from '../routes/Link'
import { Icon } from './Icon'
import { ForwardIcon } from './icons'
import './RowLink.css'

/** One answer in a list of choices, as a link to the next screen. */
export function ChoiceRow({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link to={to} className="row-link">
        <span className="row-link__text">
          <span className="row-link__name">{label}</span>
        </span>
        <Icon as={ForwardIcon} />
      </Link>
    </li>
  )
}
