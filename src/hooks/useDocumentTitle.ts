import { useEffect } from 'react'
import { content } from '../content'

/** Sets the tab title for a screen. A screen with no title of its own gets the app's full title. */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} | ${content.document.titleSuffix}` : content.document.title
  }, [title])
}
