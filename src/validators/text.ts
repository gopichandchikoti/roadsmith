export const MAX_VEHICLE_LENGTH = 60
export const MAX_QUERY_LENGTH = 60
// Letters and digits in any script, space, and the few marks a vehicle name uses: Citroën 2CV, F-150, Mercedes-Benz C/E, Mazda3 2.5 S.
const VEHICLE_DISALLOWED = /[^\p{L}\p{N} .,'&/+-]/gu
// A search may hold more punctuation than a vehicle name, but never control characters or markup brackets.
const QUERY_DISALLOWED = /[\p{Cc}\p{Cf}<>]/gu

const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim()

/** Cleans the vehicle text typed by the driver, or read back from browser storage, so it is safe to store and to put in a link. */
export function normalizeVehicle(input: string): string {
  // Line breaks and tabs become spaces first, so text pasted over two lines keeps its words apart.
  return collapse(input.replace(/\s+/g, ' ').replace(VEHICLE_DISALLOWED, '')).slice(0, MAX_VEHICLE_LENGTH).trim()
}

/** Cleans a search word list, whether typed in the box or read from the address. */
export function normalizeQuery(input: string): string {
  return collapse(input.replace(QUERY_DISALLOWED, ' ')).slice(0, MAX_QUERY_LENGTH).trim()
}

export const MAX_NOTE_LENGTH = 120

/** Cleans the few words typed about what happened. They are shown back and copied from this screen, never stored or sent. */
export function normalizeNote(input: string): string {
  return collapse(input.replace(QUERY_DISALLOWED, ' ')).slice(0, MAX_NOTE_LENGTH).trim()
}

export const THEME_CHOICES = ['system', 'light', 'dark'] as const
export type ThemeChoice = (typeof THEME_CHOICES)[number]

/** A stored theme name that is not one of the three is treated as no choice at all. */
export const parseThemeChoice = (raw: string | null): ThemeChoice | null => THEME_CHOICES.find((choice) => choice === raw) ?? null

/** Reads a stored list of checked item numbers such as "0,2,3" and drops anything else, including numbers out of range. */
export function parseCheckedItems(raw: string | null, total: number): number[] {
  if (!raw) return []
  const found = raw
    .split(',')
    .filter((part) => /^\d{1,2}$/.test(part))
    .map(Number)
    .filter((index) => index < total)
  return [...new Set(found)].sort((a, b) => a - b)
}

export const serializeCheckedItems = (items: readonly number[]): string => [...items].sort((a, b) => a - b).join(',')
