import { useId, useState } from 'react'
import { ButtonLink, ExternalLink } from '../components/Button'
import { CallSheet } from '../components/CallSheet'
import { HazardNote } from '../components/HazardNote'
import { Hero } from '../components/Hero'
import { PinIcon, RoadIcon, StoreIcon, TowIcon } from '../components/icons'
import { TextField } from '../components/TextField'
import { TickList } from '../components/TickList'
import { content } from '../content'
import { help } from '../help'
import { VehicleField } from '../features/preferences/VehicleField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePreferences } from '../hooks/usePreferences'
import { hrefs } from '../routes/route'
import { mapsSearchUrl } from '../utils/external-links'
import { buildSummary } from '../utils/summary'
import { MAX_NOTE_LENGTH, normalizeNote } from '../validators/text'
import './HelpPage.css'

/**
 * The page for a driver who needs help now and may not know the problem: make the car safe, find help nearby, and have the
 * words ready for the phone call. It reads nothing from the problem catalog, so it works on a weak signal.
 */
export function HelpPage() {
  const { vehicle } = usePreferences()
  const [what, setWhat] = useState('')
  const nearbyId = useId()
  const notSureId = useId()
  useDocumentTitle(help.title)

  return (
    <div className="help">
      <HazardNote text={help.emergency} showHelpLink={false} />
      <Hero heading={help.heading} lede={help.lede} />
      <TickList
        numbered
        heading={help.safety.heading}
        items={content.fix.highway.items}
        storageKey="roadsmith:safety"
        progressTemplate={help.safety.progress}
        doneMessage={help.safety.done}
      />
      <section className="panel" aria-labelledby={nearbyId}>
        <h2 id={nearbyId} className="panel__title">
          {help.call.heading}
        </h2>
        <p>{help.call.locationNote}</p>
        <p>{content.fix.nearby.note}</p>
        <div className="panel__actions">
          <ExternalLink href={mapsSearchUrl(content.fix.nearby.mechanicQuery)} tone="primary" icon={TowIcon}>
            {content.fix.nearby.mechanicAction}
          </ExternalLink>
          <ExternalLink href={mapsSearchUrl(content.fix.nearby.tireQuery)} icon={PinIcon}>
            {content.fix.nearby.tireAction}
          </ExternalLink>
          <ExternalLink href={mapsSearchUrl(content.fix.nearby.partsQuery)} icon={StoreIcon}>
            {content.fix.nearby.partsAction}
          </ExternalLink>
        </div>
      </section>
      <CallSheet summary={buildSummary({ vehicle, problem: normalizeNote(what) })}>
        <VehicleField />
        <TextField
          label={help.sheet.problemLabel}
          value={what}
          placeholder={help.sheet.problemPlaceholder}
          maxLength={MAX_NOTE_LENGTH}
          clearLabel={help.sheet.problemClear}
          onChange={setWhat}
          onClear={() => setWhat('')}
        />
      </CallSheet>
      <section className="panel" aria-labelledby={notSureId}>
        <h2 id={notSureId} className="panel__title">
          {help.notSure.heading}
        </h2>
        <p>{help.notSure.body}</p>
        <div className="panel__actions">
          <ButtonLink to={hrefs.diagnose()} icon={RoadIcon}>
            {help.notSure.action}
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
