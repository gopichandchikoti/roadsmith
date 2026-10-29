import { useId } from 'react'
import type { Verdict } from '../../@types/catalog'
import { ExternalLink } from '../../components/Button'
import { PinIcon, StoreIcon, TowIcon, VideoIcon } from '../../components/icons'
import '../../components/Panel.css'
import { content } from '../../content'
import { mapsSearchUrl, tutorialSearchUrl } from '../../utils/external-links'
import { fill } from '../../utils/format'

type TutorialPanelProps = {
  vehicle: string
  videoQuery: string
}

/** A video search for this problem, narrowed by the vehicle. It is a search link only: the app never names a video. */
export function TutorialPanel({ vehicle, videoQuery }: TutorialPanelProps) {
  const headingId = useId()
  return (
    <section className="panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="panel__title">
        {content.fix.tutorial.heading}
      </h2>
      <p>{vehicle ? fill(content.fix.tutorial.body, { vehicle }) : content.fix.tutorial.bodyNoVehicle}</p>
      <div className="panel__actions">
        <ExternalLink href={tutorialSearchUrl(vehicle, videoQuery)} icon={VideoIcon}>
          {content.fix.tutorial.action}
        </ExternalLink>
      </div>
    </section>
  )
}

type NearbyPanelProps = {
  verdict: Verdict
  category: string
}

/** Map searches for help near the driver. A problem that needs help already shows the mechanic link above, so it is not repeated. */
export function NearbyPanel({ verdict, category }: NearbyPanelProps) {
  const headingId = useId()
  const needsHelp = verdict === 'help'
  return (
    <section className="panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="panel__title">
        {content.fix.nearby.heading}
      </h2>
      <p>{content.fix.nearby.note}</p>
      <div className="panel__actions">
        <ExternalLink href={mapsSearchUrl(content.fix.nearby.partsQuery)} tone={needsHelp ? 'quiet' : 'primary'} icon={StoreIcon}>
          {content.fix.nearby.partsAction}
        </ExternalLink>
        {needsHelp ? null : (
          <ExternalLink href={mapsSearchUrl(content.fix.nearby.mechanicQuery)} icon={TowIcon}>
            {content.fix.nearby.mechanicAction}
          </ExternalLink>
        )}
        {category === 'tires' ? (
          <ExternalLink href={mapsSearchUrl(content.fix.nearby.tireQuery)} icon={PinIcon}>
            {content.fix.nearby.tireAction}
          </ExternalLink>
        ) : null}
      </div>
    </section>
  )
}
