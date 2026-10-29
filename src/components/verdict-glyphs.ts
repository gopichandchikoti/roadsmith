import type { Verdict } from '../@types/catalog'
import { RoadIcon, StopIcon, ToolIcon, type TablerIcon } from './icons'

/** Each verdict has its own glyph as well as its own words, so the answer never rests on colour alone. */
export const VERDICT_GLYPHS: Record<Verdict, TablerIcon> = {
  fix: ToolIcon,
  limp: RoadIcon,
  help: StopIcon,
}
