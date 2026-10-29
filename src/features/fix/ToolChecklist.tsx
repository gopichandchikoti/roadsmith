import { TickList } from '../../components/TickList'
import { content } from '../../content'

type ToolChecklistProps = {
  problemId: string
  tools: readonly string[]
}

/** The tools and parts to have ready, as a real checklist whose ticks are kept for this tab only. */
export function ToolChecklist({ problemId, tools }: ToolChecklistProps) {
  return (
    <TickList
      heading={content.fix.toolsHeading}
      items={tools}
      storageKey={`roadsmith:checks:${problemId}`}
      progressTemplate={content.fix.toolsProgress}
      doneMessage={content.fix.toolsDone}
    />
  )
}
