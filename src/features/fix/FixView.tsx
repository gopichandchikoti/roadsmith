import type { Problem } from '../../@types/catalog'
import { BackLink } from '../../components/BackLink'
import { Button, ButtonLink } from '../../components/Button'
import { HazardNote } from '../../components/HazardNote'
import { Icon } from '../../components/Icon'
import { ClockIcon, OfflineIcon, RetryIcon, SkillIcon } from '../../components/icons'
import { ListSkeleton } from '../../components/ListSkeleton'
import { PageHeading } from '../../components/PageHeading'
import { StatePanel } from '../../components/StatePanel'
import { content } from '../../content'
import { useCatalog } from '../../hooks/useCatalog'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { hrefs } from '../../routes/route'
import { fill } from '../../utils/format'
import { usePreferences } from '../../hooks/usePreferences'
import { HelpBanner } from './HelpBanner'
import { HighwayPanel } from './HighwayPanel'
import { NearbyPanel, TutorialPanel } from './HelpLinks'
import { StepList, StopPanel } from './StepList'
import { ToolChecklist } from './ToolChecklist'
import { VerdictLadder } from './VerdictLadder'
import './FixView.css'

/** The result screen for one problem: the verdict first, then what to have ready, what to do and where to get help. */
export function FixView({ id }: { id: string }) {
  const { state, retry } = useCatalog()
  const problem = state.status === 'ready' ? (state.catalog.problems.find((item) => item.id === id) ?? null) : null
  useDocumentTitle(problem?.name ?? null)

  if (state.status === 'loading') {
    return (
      <div className="fix">
        <HazardNote />
        <ListSkeleton />
      </div>
    )
  }

  if (state.status === 'error') {
    const offline = navigator.onLine === false
    return (
      <div className="fix">
        <HazardNote />
        <PageHeading>{content.states.error.title}</PageHeading>
        <StatePanel
          tone="error"
          icon={offline ? OfflineIcon : undefined}
          action={
            <Button tone="primary" icon={RetryIcon} onClick={retry}>
              {content.states.error.retry}
            </Button>
          }
        >
          {offline ? content.states.error.offlineBody : content.states.error.body}
        </StatePanel>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="fix">
        <PageHeading>{content.fix.unknown.title}</PageHeading>
        <StatePanel tone="notice" action={<ButtonLink to={hrefs.home()}>{content.fix.unknown.action}</ButtonLink>}>
          {content.fix.unknown.body}
        </StatePanel>
      </div>
    )
  }

  return <FixResult key={problem.id} problem={problem} />
}

function FixResult({ problem }: { problem: Problem }) {
  const { vehicle } = usePreferences()
  return (
    <div className="fix">
      <HazardNote />
      <BackLink fallbackHref={hrefs.home()}>{content.fix.back}</BackLink>
      <header className="fix__head">
        {vehicle ? <p className="fix__vehicle">{fill(content.fix.vehicleLine, { vehicle })}</p> : null}
        <PageHeading>{problem.name}</PageHeading>
        <p className="fix__summary">{problem.summary}</p>
        <dl className="facts">
          <div className="facts__item">
            <dt>{content.fix.skillLabel}</dt>
            <dd>
              <Icon as={SkillIcon} size={18} />
              {content.skills[problem.skill]}
            </dd>
          </div>
          <div className="facts__item">
            <dt>{content.fix.timeLabel}</dt>
            <dd>
              <Icon as={ClockIcon} size={18} />
              {problem.time}
            </dd>
          </div>
        </dl>
      </header>

      <VerdictLadder verdict={problem.verdict} />
      {problem.verdict === 'help' ? <HelpBanner /> : null}

      <div className="fix__columns">
        <div className="fix__area fix__area--tools">
          <ToolChecklist problemId={problem.id} tools={problem.tools} />
        </div>
        <div className="fix__area fix__area--steps">
          <StepList verdict={problem.verdict} steps={problem.steps} />
        </div>
        <div className="fix__area fix__area--stop">
          <StopPanel stopIf={problem.stopIf} />
        </div>
        <div className="fix__area fix__area--tutorial">
          <TutorialPanel vehicle={vehicle} videoQuery={problem.videoQuery} />
        </div>
        <div className="fix__area fix__area--nearby">
          <NearbyPanel verdict={problem.verdict} category={problem.category} />
        </div>
        <div className="fix__area fix__area--highway">
          <HighwayPanel />
        </div>
      </div>

      <div className="fix__restart">
        <ButtonLink to={hrefs.home()}>{content.fix.restart}</ButtonLink>
      </div>
    </div>
  )
}
