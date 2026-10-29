import { ButtonLink } from '../components/Button'
import { PageHeading } from '../components/PageHeading'
import { StatePanel } from '../components/StatePanel'
import { content } from '../content'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { hrefs } from '../routes/route'

export function NotFoundPage() {
  useDocumentTitle(content.notFound.title)
  return (
    <div className="not-found">
      <PageHeading>{content.notFound.title}</PageHeading>
      <StatePanel tone="notice" action={<ButtonLink to={hrefs.home()}>{content.notFound.action}</ButtonLink>}>
        {content.notFound.body}
      </StatePanel>
    </div>
  )
}
