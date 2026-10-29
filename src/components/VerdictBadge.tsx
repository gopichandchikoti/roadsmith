import type { Verdict } from '../@types/catalog'
import { content } from '../content'
import { Icon } from './Icon'
import { VERDICT_GLYPHS } from './verdict-glyphs'
import './VerdictBadge.css'

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className="verdict-badge" data-verdict={verdict}>
      <Icon as={VERDICT_GLYPHS[verdict]} size={16} />
      <span>{content.verdicts[verdict].label}</span>
    </span>
  )
}
