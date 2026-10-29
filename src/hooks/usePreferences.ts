import { createContext, useContext } from 'react'
import type { ThemeChoice } from '../validators/text'

export type Preferences = {
  vehicle: string
  setVehicle: (value: string) => void
  clearVehicle: () => void
  theme: ThemeChoice
  setTheme: (choice: ThemeChoice) => void
}

export const PreferencesContext = createContext<Preferences | null>(null)

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}
