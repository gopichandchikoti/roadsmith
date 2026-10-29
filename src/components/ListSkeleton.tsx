import { content } from '../content'
import './ListSkeleton.css'

const ROW_COUNT = 6

/**
 * The shape of a problem list while it loads: rows where rows will be. The rows are hidden from assistive technology and
 * one polite status says what is happening.
 */
export function ListSkeleton() {
  return (
    <div className="list-skeleton">
      <output className="visually-hidden" aria-live="polite">
        {content.states.loading}
      </output>
      <ul className="list-skeleton__rows" aria-hidden="true">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <li key={index} className="list-skeleton__row" />
        ))}
      </ul>
    </div>
  )
}
