import type { MouseEvent } from 'react'
import { useRouter } from '../routes/router-context'
import { Icon } from './Icon'
import { BackIcon } from './icons'
import './Controls.css'

type BackLinkProps = {
  /** Where Back goes when this visit has no earlier screen inside the app, for example a shared address. */
  fallbackHref: string
  children: string
}

export function BackLink({ fallbackHref, children }: BackLinkProps) {
  const { back } = useRouter()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (event.button !== 0 || modified) return
    event.preventDefault()
    back(fallbackHref)
  }
  return (
    <a href={fallbackHref} className="back-link" onClick={handleClick}>
      <Icon as={BackIcon} />
      <span>{children}</span>
    </a>
  )
}
