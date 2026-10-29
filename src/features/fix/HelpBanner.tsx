import { ExternalLink } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { StopIcon, TowIcon } from '../../components/icons'
import { content } from '../../content'
import { mapsSearchUrl } from '../../utils/external-links'
import './HelpBanner.css'

/** Shown above everything else when the verdict is to get help: do not drive, and the one action that matters. */
export function HelpBanner() {
  return (
    <section className="help-banner" aria-labelledby="help-banner-title">
      <div className="help-banner__head">
        <Icon as={StopIcon} size={28} />
        <h2 id="help-banner-title" className="help-banner__title">
          {content.verdicts.helpBanner.title}
        </h2>
      </div>
      <p>{content.verdicts.helpBanner.body}</p>
      <ExternalLink href={mapsSearchUrl(content.fix.nearby.mechanicQuery)} tone="primary" icon={TowIcon}>
        {content.fix.nearby.mechanicAction}
      </ExternalLink>
    </section>
  )
}
