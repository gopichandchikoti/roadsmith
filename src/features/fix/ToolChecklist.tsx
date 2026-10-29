import { useId, useState } from 'react'
import { Icon } from '../../components/Icon'
import { CheckIcon } from '../../components/icons'
import { content } from '../../content'
import { fill } from '../../utils/format'
import { readStored, writeStored } from '../../utils/storage'
import { parseCheckedItems, serializeCheckedItems } from '../../validators/text'
import './ToolChecklist.css'

type ToolChecklistProps = {
  problemId: string
  tools: readonly string[]
}

/**
 * The tools and parts to have ready, as a real checklist. Ticks are kept for this tab only (session storage), so a reload on
 * the roadside does not lose them and nothing outlives the visit.
 */
export function ToolChecklist({ problemId, tools }: ToolChecklistProps) {
  const headingId = useId()
  const storageKey = `roadsmith:checks:${problemId}`
  const [checked, setChecked] = useState<number[]>(() => parseCheckedItems(readStored('session', storageKey), tools.length))
  const ready = checked.length === tools.length

  const toggle = (index: number) => {
    const next = checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index]
    setChecked(next)
    writeStored('session', storageKey, serializeCheckedItems(next))
  }

  return (
    <section className="panel checklist" aria-labelledby={headingId}>
      <div className="checklist__head">
        <h2 id={headingId} className="panel__title">
          {content.fix.toolsHeading}
        </h2>
        <p className="checklist__progress">{fill(content.fix.toolsProgress, { done: checked.length, total: tools.length })}</p>
      </div>
      <div className="checklist__bar" aria-hidden="true">
        <div
          className="checklist__fill"
          style={{ transform: `scaleX(${tools.length === 0 ? 0 : checked.length / tools.length})` }}
        />
      </div>
      <ul className="checklist__list">
        {tools.map((tool, index) => (
          <li key={tool}>
            <label className="check">
              <input type="checkbox" className="check__input" checked={checked.includes(index)} onChange={() => toggle(index)} />
              <span className="check__box" aria-hidden="true">
                <Icon as={CheckIcon} size={18} />
              </span>
              <span className="check__text">{tool}</span>
            </label>
          </li>
        ))}
      </ul>
      <output className="checklist__done" aria-live="polite">
        {ready ? content.fix.toolsDone : ''}
      </output>
    </section>
  )
}
