import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from '../routes/router-context'

/**
 * The one h1 of a screen. When the screen was reached by navigating, focus moves here so a keyboard or screen reader user
 * lands at the top of the new content instead of on a link that no longer exists. The first screen is left alone, and so is
 * a later address change on the same screen (typing in a search), because the choice is made once, when the heading appears.
 */
export function PageHeading({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const { navigationCount } = useRouter()
  const [arrivedByNavigation] = useState(navigationCount > 0)

  useEffect(() => {
    if (arrivedByNavigation) heading.current?.focus({ preventScroll: true })
  }, [arrivedByNavigation])

  return (
    <h1 ref={heading} tabIndex={-1} className="page-heading">
      {children}
    </h1>
  )
}
