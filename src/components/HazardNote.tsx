import { content } from '../content'
import { Icon } from './Icon'
import { HazardIcon } from './icons'
import './HazardNote.css'

/** The standing reminder to make the car safe before anything else. It is always shown on the finding and result screens. */
export function HazardNote() {
  return (
    <p className="hazard-note">
      <Icon as={HazardIcon} size={22} />
      <span>{content.shell.hazard}</span>
    </p>
  )
}
