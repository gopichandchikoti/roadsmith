import type { ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { ToolIcon } from '../components/icons'
import { content } from '../content'
import { ThemeToggle } from '../features/preferences/ThemeToggle'
import { Link } from '../routes/Link'
import { hrefs } from '../routes/route'
import { useRouter } from '../routes/router-context'
import './AppShell.css'

/** The frame every screen sits in: skip link, top bar, the one main landmark and a footer with the legal pages. */
export function AppShell({ children }: { children: ReactNode }) {
  const { navigationCount } = useRouter()
  return (
    <div className="shell" data-navigated={navigationCount > 0}>
      <a className="skip-link" href="#main">
        {content.skipLink}
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Link to={hrefs.home()} className="wordmark" aria-label={content.brand.homeLabel}>
            <Icon as={ToolIcon} size={26} />
            <span className="wordmark__text">{content.brand.name}</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <p className="footer__note">{content.shell.footer}</p>
          <nav className="footer__nav" aria-label={content.shell.footerNavLabel}>
            <Link to={hrefs.privacy}>{content.shell.privacy}</Link>
            <Link to={hrefs.terms}>{content.shell.terms}</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
