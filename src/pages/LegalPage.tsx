import { PageHeading } from '../components/PageHeading'
import { legal } from '../legal'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './LegalPage.css'

/** The Privacy and Terms pages. Their text is in the content model and is written to match what the code does. */
export function LegalPage({ document }: { document: 'privacy' | 'terms' }) {
  const text = legal[document]
  useDocumentTitle(text.title)
  return (
    <article className="legal">
      <PageHeading>{text.title}</PageHeading>
      <p className="legal__updated">
        {legal.updatedLabel} {text.updated}
      </p>
      {text.sections.map((section) => (
        <section key={section.heading} className="legal__section">
          <h2 className="legal__heading">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </article>
  )
}
