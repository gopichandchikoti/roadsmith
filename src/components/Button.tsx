import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { content } from '../content'
import { Link } from '../routes/Link'
import { cx } from '../utils/format'
import { Icon } from './Icon'
import { ExternalIcon, type TablerIcon } from './icons'
import './Controls.css'

type Tone = 'primary' | 'quiet'

type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  tone?: Tone
  icon?: TablerIcon
  children: ReactNode
}

export function Button({ tone = 'quiet', icon, children, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} className={cx('button', `button--${tone}`, className)}>
      {icon ? <Icon as={icon} /> : null}
      <span>{children}</span>
    </button>
  )
}

type ButtonLinkProps = {
  to: string
  tone?: Tone
  icon?: TablerIcon
  children: ReactNode
}

/** A link to another screen, drawn as a button. */
export function ButtonLink({ to, tone = 'quiet', icon, children }: ButtonLinkProps) {
  return (
    <Link to={to} className={cx('button', `button--${tone}`)}>
      {icon ? <Icon as={icon} /> : null}
      <span>{children}</span>
    </Link>
  )
}

type ExternalLinkProps = {
  href: string
  tone?: Tone
  icon?: TablerIcon
  children: ReactNode
}

/** A link to another site, drawn as a button. It opens in a new tab and says so, and sends no referrer or window handle. */
export function ExternalLink({ href, tone = 'quiet', icon, children }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx('button', `button--${tone}`)}>
      {icon ? <Icon as={icon} /> : null}
      <span>
        {children} <span className="visually-hidden">{content.shell.newTab}</span>
      </span>
      <Icon as={ExternalIcon} size={16} />
    </a>
  )
}
