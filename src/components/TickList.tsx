import { useId, useState } from 'react'
import { content } from '../content'
import { fill } from '../utils/format'
import { readStored, writeStored } from '../utils/storage'
import { parseCheckedItems, serializeCheckedItems } from '../validators/text'
import { Icon } from './Icon'
import { CheckIcon } from './icons'
import './Panel.css'
import './TickList.css'

type TickListProps = {
  heading: string
  items: readonly string[]
  /** Where the ticks are kept. Session storage, so they last until the tab closes and nothing outlives the visit. */
  storageKey: string
  /** A content string with `{done}` and `{total}`. */
  progressTemplate: string
  doneMessage: string
  /** Shows each item's number in its box until it is ticked, and marks the first item still to do. */
  numbered?: boolean
}

/**
 * A real checklist: each item is a checkbox, the count and a progress bar follow the ticks, and a polite message is announced
 * when the last one is ticked. A reload on the roadside does not lose the ticks.
 */
export function TickList({ heading, items, storageKey, progressTemplate, doneMessage, numbered = false }: TickListProps) {
  const headingId = useId()
  const [checked, setChecked] = useState<number[]>(() => parseCheckedItems(readStored('session', storageKey), items.length))
  const finished = checked.length === items.length
  const nextIndex = numbered && !finished ? items.findIndex((_, index) => !checked.includes(index)) : -1
  const List = numbered ? 'ol' : 'ul'

  const toggle = (index: number) => {
    const next = checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index]
    setChecked(next)
    writeStored('session', storageKey, serializeCheckedItems(next))
  }

  return (
    <section className="panel checklist" aria-labelledby={headingId}>
      <div className="checklist__head">
        <h2 id={headingId} className="panel__title">
          {heading}
        </h2>
        <p className="checklist__progress">{fill(progressTemplate, { done: checked.length, total: items.length })}</p>
      </div>
      <div className="checklist__bar" aria-hidden="true">
        <div
          className="checklist__fill"
          style={{ transform: `scaleX(${items.length === 0 ? 0 : checked.length / items.length})` }}
        />
      </div>
      <List className="checklist__list">
        {items.map((item, index) => (
          <li key={item} className="checklist__item" aria-current={index === nextIndex ? 'step' : undefined}>
            <label className="check">
              <input type="checkbox" className="check__input" checked={checked.includes(index)} onChange={() => toggle(index)} />
              <span className="check__box" aria-hidden="true">
                {numbered ? <span className="check__number">{index + 1}</span> : null}
                <Icon as={CheckIcon} size={18} />
              </span>
              <span className="check__text">{item}</span>
              {index === nextIndex ? <span className="check__next">{content.fix.stepNext}</span> : null}
            </label>
          </li>
        ))}
      </List>
      <output className="checklist__done" aria-live="polite">
        {finished ? doneMessage : ''}
      </output>
    </section>
  )
}
