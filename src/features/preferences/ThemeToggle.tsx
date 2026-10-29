import { Icon } from '../../components/Icon'
import { DayIcon, DeviceIcon, NightIcon, type TablerIcon } from '../../components/icons'
import { content } from '../../content'
import type { ThemeChoice } from '../../validators/text'
import { usePreferences } from '../../hooks/usePreferences'
import './ThemeToggle.css'

const OPTIONS: readonly { value: ThemeChoice; glyph: TablerIcon }[] = [
  { value: 'system', glyph: DeviceIcon },
  { value: 'light', glyph: DayIcon },
  { value: 'dark', glyph: NightIcon },
]

/** Match the device, day or night. A real radio group, so the arrow keys and a screen reader work as expected. */
export function ThemeToggle() {
  const { theme, setTheme } = usePreferences()
  return (
    <fieldset className="theme-toggle">
      <legend className="visually-hidden">{content.theme.groupLabel}</legend>
      {OPTIONS.map(({ value, glyph }) => (
        <label key={value} className="theme-toggle__option">
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => setTheme(value)}
            className="theme-toggle__input"
          />
          <span className="theme-toggle__face">
            <Icon as={glyph} />
          </span>
          <span className="visually-hidden">{content.theme[value]}</span>
        </label>
      ))}
    </fieldset>
  )
}
