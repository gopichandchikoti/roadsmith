import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { useRouter } from './router-context'

type LinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  to: string
  replace?: boolean
}

/** A real anchor, so it opens in a new tab and can be copied. A plain click is handled by the router with no page reload. */
export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (event.defaultPrevented || event.button !== 0 || modified) return
    event.preventDefault()
    navigate(to, { replace })
  }
  return (
    <a {...rest} href={to} onClick={handleClick}>
      {children}
    </a>
  )
}
