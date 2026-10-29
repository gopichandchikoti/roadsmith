import type { Catalog } from '../../@types/catalog'
import { Button, ButtonLink } from '../../components/Button'
import { ChoiceRow } from '../../components/ChoiceRow'
import { BackLink } from '../../components/BackLink'
import { RetryIcon } from '../../components/icons'
import { ListSkeleton } from '../../components/ListSkeleton'
import { PageHeading } from '../../components/PageHeading'
import { ProblemRow } from '../../components/ProblemRow'
import { StatePanel } from '../../components/StatePanel'
import { VerdictBadge } from '../../components/VerdictBadge'
import { content } from '../../content'
import { useCatalog } from '../../hooks/useCatalog'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { hrefs } from '../../routes/route'
import { fill } from '../../utils/format'
import './DiagnosePanel.css'

type DiagnosePanelProps = {
  symptom: string | null
  option: number | null
}

const QUESTION_COUNT = 2

/** Help me find it: pick the symptom, answer one more question, then see the most likely cause and the alternatives. */
export function DiagnosePanel({ symptom, option }: DiagnosePanelProps) {
  const { state, retry } = useCatalog()
  useDocumentTitle(content.diagnose.title)

  if (state.status === 'loading') {
    return (
      <div className="diagnose">
        <PageHeading>{content.diagnose.firstHeading}</PageHeading>
        <ListSkeleton />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="diagnose">
        <PageHeading>{content.diagnose.firstHeading}</PageHeading>
        <StatePanel
          tone="error"
          title={content.states.error.title}
          action={
            <Button tone="primary" icon={RetryIcon} onClick={retry}>
              {content.states.error.retry}
            </Button>
          }
        >
          {navigator.onLine === false ? content.states.error.offlineBody : content.states.error.body}
        </StatePanel>
      </div>
    )
  }

  return <DiagnoseSteps catalog={state.catalog} symptom={symptom} option={option} />
}

type DiagnoseStepsProps = DiagnosePanelProps & { catalog: Catalog }

function DiagnoseSteps({ catalog, symptom, option }: DiagnoseStepsProps) {
  if (symptom === null) {
    return (
      <div className="diagnose">
        <PageHeading>{content.diagnose.firstHeading}</PageHeading>
        <p className="diagnose__step">{fill(content.diagnose.step, { current: 1, total: QUESTION_COUNT })}</p>
        <ul className="diagnose__list">
          {catalog.triage.map((question) => (
            <ChoiceRow key={question.id} to={hrefs.diagnose(question.id)} label={question.label} />
          ))}
        </ul>
      </div>
    )
  }

  const question = catalog.triage.find((item) => item.id === symptom)
  const chosen = question && option !== null ? question.options[option] : undefined
  if (!question || (option !== null && !chosen)) {
    return (
      <div className="diagnose">
        <PageHeading>{content.diagnose.unknown.title}</PageHeading>
        <StatePanel tone="notice" action={<ButtonLink to={hrefs.diagnose()}>{content.diagnose.unknown.action}</ButtonLink>}>
          {content.diagnose.unknown.body}
        </StatePanel>
      </div>
    )
  }

  if (!chosen) {
    return (
      <div className="diagnose">
        <BackLink fallbackHref={hrefs.diagnose()}>{content.diagnose.back}</BackLink>
        <PageHeading>{question.question}</PageHeading>
        <p className="diagnose__step">{fill(content.diagnose.step, { current: 2, total: QUESTION_COUNT })}</p>
        <ul className="diagnose__list">
          {question.options.map((item, index) => (
            <ChoiceRow key={item.label} to={hrefs.diagnose(question.id, index)} label={item.label} />
          ))}
        </ul>
      </div>
    )
  }

  const [topId, ...otherIds] = chosen.problemIds
  const top = catalog.problems.find((problem) => problem.id === topId)
  const others = otherIds.flatMap((id) => catalog.problems.find((problem) => problem.id === id) ?? [])
  if (!top) return null

  return (
    <div className="diagnose">
      <BackLink fallbackHref={hrefs.diagnose(question.id)}>{content.diagnose.back}</BackLink>
      <PageHeading>{content.diagnose.likelyHeading}</PageHeading>
      <section className="likely" aria-labelledby="likely-name">
        <h2 id="likely-name" className="likely__name">
          {top.name}
        </h2>
        <p>{top.summary}</p>
        <div className="likely__verdict">
          <VerdictBadge verdict={top.verdict} />
          <span className="likely__note">{content.verdicts[top.verdict].note}</span>
        </div>
        <ButtonLink to={hrefs.fix(top.id)} tone="primary">
          {content.diagnose.seeFix}
        </ButtonLink>
      </section>
      {others.length > 0 ? (
        <section aria-labelledby="also-heading" className="diagnose__also">
          <h2 id="also-heading" className="diagnose__also-title">
            {content.diagnose.alsoHeading}
          </h2>
          <ul className="diagnose__list">
            {others.map((problem) => (
              <ProblemRow key={problem.id} problem={problem} />
            ))}
          </ul>
        </section>
      ) : null}
      <p className="diagnose__disclaimer">{content.diagnose.disclaimer}</p>
    </div>
  )
}
