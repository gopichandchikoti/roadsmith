import type { TablerIcon } from './icons'

type IconProps = {
  as: TablerIcon
  size?: number
}

const DEFAULT_SIZE = 20
const STROKE_WIDTH = 2

/** A decorative icon: hidden from assistive technology, because the text beside it says the same thing. */
export function Icon({ as: Glyph, size = DEFAULT_SIZE }: IconProps) {
  return <Glyph size={size} stroke={STROKE_WIDTH} aria-hidden="true" focusable="false" />
}
