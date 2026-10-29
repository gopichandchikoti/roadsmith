import { useId, useState, type ReactNode } from 'react'
import { help } from '../help'
import { Button } from './Button'
import { CheckIcon, CopyIcon } from './icons'
import './Panel.css'
import './CallSheet.css'

type CallSheetProps = {
  /** The text to read out. Empty when the driver has not given anything to say yet. */
  summary: string
  /** Inputs that feed the summary, drawn above it. */
  children?: ReactNode
}

type CopyResult = { text: string; status: 'copied' | 'failed' }

/**
 * What to tell a tow operator or a mechanic, as text the driver can read out or copy. The summary is built on this screen from
 * what the driver entered and is never sent anywhere. A copy that the browser refuses says so and leaves the text selectable.
 */
export function CallSheet({ summary, children }: CallSheetProps) {
  const headingId = useId()
  const textId = useId()
  const [result, setResult] = useState<CopyResult | null>(null)
  // The message belongs to the text that was copied, so changing the summary clears it without an effect.
  const status = result?.text === summary ? result.status : null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setResult({ text: summary, status: 'copied' })
    } catch {
      setResult({ text: summary, status: 'failed' })
    }
  }

  return (
    <section className="panel callsheet" aria-labelledby={headingId}>
      <h2 id={headingId} className="panel__title">
        {help.sheet.heading}
      </h2>
      <p>{help.sheet.body}</p>
      {children}
      {summary === '' ? (
        <p className="callsheet__empty">{help.sheet.empty}</p>
      ) : (
        <div className="field">
          <label htmlFor={textId} className="field__label">
            {help.sheet.textLabel}
          </label>
          <textarea
            id={textId}
            className="field__input callsheet__text"
            readOnly
            rows={summary.split('\n').length + 1}
            value={summary}
          />
        </div>
      )}
      <div className="panel__actions">
        <Button tone="primary" icon={status === 'copied' ? CheckIcon : CopyIcon} disabled={summary === ''} onClick={copy}>
          {help.sheet.copy}
        </Button>
      </div>
      <output className="callsheet__status" aria-live="polite">
        {status === null ? '' : help.sheet[status === 'copied' ? 'copied' : 'copyFailed']}
      </output>
    </section>
  )
}
