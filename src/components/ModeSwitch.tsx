import { content } from '../content'
import { Link } from '../routes/Link'
import { hrefs } from '../routes/route'
import './ModeSwitch.css'

type Mode = 'browse' | 'diagnose'

/**
 * The two ways in: pick a known problem, or answer questions. Each is a real link to its own address, so Back and sharing work.
 * The highlight slides between them on the snappy spring (transform only).
 */
export function ModeSwitch({ active }: { active: Mode }) {
  return (
    <nav className="mode-switch" aria-label={content.modes.navLabel} data-active={active}>
      <span className="mode-switch__thumb" aria-hidden="true" />
      <Link to={hrefs.home()} className="mode-switch__item" aria-current={active === 'browse' ? 'page' : undefined}>
        {content.modes.browse}
      </Link>
      <Link to={hrefs.diagnose()} className="mode-switch__item" aria-current={active === 'diagnose' ? 'page' : undefined}>
        {content.modes.diagnose}
      </Link>
    </nav>
  )
}
