/** What a driver should do about a problem: sort it out on the spot, drive on carefully, or stop and get help. */
export const VERDICTS = ['fix', 'limp', 'help'] as const
export type Verdict = (typeof VERDICTS)[number]

export const SKILLS = ['beginner', 'moderate', 'advanced'] as const
export type Skill = (typeof SKILLS)[number]

export type Category = {
  id: string
  label: string
}

export type Problem = {
  id: string
  category: string
  name: string
  verdict: Verdict
  skill: Skill
  time: string
  summary: string
  tools: string[]
  steps: string[]
  /** Search words for a video search. The app never states a video title, channel or length. */
  videoQuery: string
  stopIf: string
  /** Extra words people use for the problem, so a search finds it. */
  keywords: string[]
}

export type TriageOption = {
  label: string
  /** The most likely problem first. */
  problemIds: string[]
}

export type TriageQuestion = {
  id: string
  label: string
  question: string
  options: TriageOption[]
}

export type Catalog = {
  categories: Category[]
  problems: Problem[]
  triage: TriageQuestion[]
}
