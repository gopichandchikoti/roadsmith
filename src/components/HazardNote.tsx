import { content } from '../content'
import { hrefs } from '../routes/route'
import { ButtonLink } from './Button'
import { Icon } from './Icon'
import { HazardIcon, HelpIcon } from './icons'
import './HazardNote.css'

type HazardNoteProps = {
  /** The reminder to show. It is the make-the-car-safe line unless a screen has a more pressing one. */
  text?: string
  /** A link to the Help screen. The Help screen itself leaves it out. */
  showHelpLink?: boolean
}

/** The standing reminder to make the car safe before anything else, with a way straight to help. */
export function HazardNote({ text = content.shell.hazard, showHelpLink = true }: HazardNoteProps) {
  return (
    <div className="hazard-note">
      <p className="hazard-note__text">
        <Icon as={HazardIcon} size={22} />
        <span>{text}</span>
      </p>
      {showHelpLink ? (
        <ButtonLink to={hrefs.help} icon={HelpIcon}>
          {content.shell.helpLink}
        </ButtonLink>
      ) : null}
    </div>
  )
}
