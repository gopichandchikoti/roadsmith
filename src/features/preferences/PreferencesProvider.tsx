import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStored, removeStored, writeStored } from '../../utils/storage'
import { normalizeVehicle, type ThemeChoice } from '../../validators/text'
import { PreferencesContext, type Preferences } from '../../hooks/usePreferences'
import { applyTheme, readStoredTheme, THEME_KEY } from './theme'

const VEHICLE_KEY = 'roadsmith:vehicle'

/** The driver's vehicle text and theme choice. Both live in this browser only and are cleaned again on every read. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [vehicle, setVehicleState] = useState(() => normalizeVehicle(readStored('local', VEHICLE_KEY) ?? ''))
  const [theme, setThemeState] = useState<ThemeChoice>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setVehicle = useCallback((value: string) => {
    const clean = normalizeVehicle(value)
    setVehicleState(clean)
    if (clean) writeStored('local', VEHICLE_KEY, clean)
    else removeStored('local', VEHICLE_KEY)
  }, [])

  const clearVehicle = useCallback(() => setVehicle(''), [setVehicle])

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice)
    writeStored('local', THEME_KEY, choice)
  }, [])

  const value = useMemo<Preferences>(
    () => ({ vehicle, setVehicle, clearVehicle, theme, setTheme }),
    [vehicle, setVehicle, clearVehicle, theme, setTheme],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
