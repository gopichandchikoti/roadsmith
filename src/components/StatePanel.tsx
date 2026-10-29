import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { TablerIcon } from './icons'
import './StatePanel.css'

type StatePanelProps = {
  /** `error` is announced at once; `empty` and `notice` are announced politely. */
  tone: 'error' | 'empty' | 'notice'
  icon?: TablerIcon
  title?: string
  children: ReactNode
  action?: ReactNode
}

/** An empty, failed or missing-content state: what happened, in plain words, and the one thing the driver can do about it. */
export function StatePanel({ tone, icon, title, children, action }: StatePanelProps) {
  return (
    <div className="state-panel" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      {icon ? <Icon as={icon} size={28} /> : null}
      <div className="state-panel__text">
        {title ? <h2 className="state-panel__title">{title}</h2> : null}
        <p>{children}</p>
      </div>
      {action ? <div className="state-panel__action">{action}</div> : null}
    </div>
  )
}
