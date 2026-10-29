import { help } from '../help'
import { fill } from './format'

export type SummaryInput = {
  vehicle: string
  problem: string
  details?: string
}

/**
 * The lines a driver can read out to a tow operator or a mechanic. A line with nothing to say is left out, so the text never
 * holds an empty "Vehicle:". With nothing at all to say the result is an empty string.
 */
export function buildSummary({ vehicle, problem, details = '' }: SummaryInput): string {
  const { vehicleLine, problemLine, detailsLine } = help.sheet
  const lines: string[] = []
  if (vehicle) lines.push(fill(vehicleLine, { value: vehicle }))
  if (problem) lines.push(fill(problemLine, { value: problem }))
  if (details) lines.push(fill(detailsLine, { value: details }))
  return lines.join('\n')
}
