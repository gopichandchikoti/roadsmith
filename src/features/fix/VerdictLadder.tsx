import { useId } from 'react'
import { VERDICTS, type Verdict } from '../../@types/catalog'
import { Icon } from '../../components/Icon'
import { VERDICT_GLYPHS } from '../../components/verdict-glyphs'
import { content } from '../../content'
import './VerdictLadder.css'

/** How serious each outcome is, as the number of filled segments beside it. */
const SEVERITY: Record<Verdict, number> = { fix: 1, limp: 2, help: 3 }
const SEGMENTS = [1, 2, 3] as const

/**
 * The answer, drawn as the three possible outcomes with this problem's marked. The row says it in words, a glyph and a number of
 * filled segments, so it reads the same in any colour vision and at a glance.
 */
export function VerdictLadder({ verdict }: { verdict: Verdict }) {
  const headingId = useId()
  return (
    <section className="ladder" aria-labelledby={headingId}>
      <h2 id={headingId} className="ladder__heading">
        {content.verdicts.heading}
      </h2>
      <ol className="ladder__list" aria-label={content.verdicts.ladderLabel}>
        {VERDICTS.map((candidate) => {
          const current = candidate === verdict
          const copy = content.verdicts[candidate]
          return (
            <li
              key={candidate}
              className="ladder__row"
              data-verdict={candidate}
              data-current={current}
              aria-current={current ? 'true' : undefined}
            >
              <span className="ladder__marks" aria-hidden="true">
                {SEGMENTS.map((segment) => (
                  <span key={segment} className="ladder__mark" data-filled={segment <= SEVERITY[candidate]} />
                ))}
              </span>
              <span className="ladder__glyph">
                <Icon as={VERDICT_GLYPHS[candidate]} size={24} />
              </span>
              <span className="ladder__text">
                <span className="ladder__label">{copy.label}</span>
                <span className="ladder__note">{copy.note}</span>
              </span>
              {current ? <span className="ladder__tag">{content.verdicts.current}</span> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
