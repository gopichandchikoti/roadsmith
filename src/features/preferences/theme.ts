import { readStored } from '../../utils/storage'
import { parseThemeChoice, type ThemeChoice } from '../../validators/text'

export const THEME_KEY = 'roadsmith:theme'

/** `system` leaves the attribute off, so the stylesheet follows the device's own setting. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') delete root.dataset.theme
  else root.dataset.theme = choice
}

/** Reads the saved choice, so the page can take it before the first render rather than flash the other theme. */
export function readStoredTheme(): ThemeChoice {
  return parseThemeChoice(readStored('local', THEME_KEY)) ?? 'system'
}
