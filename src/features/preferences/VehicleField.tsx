import { useState } from 'react'
import { TextField } from '../../components/TextField'
import { content } from '../../content'
import { usePreferences } from '../../hooks/usePreferences'
import { MAX_VEHICLE_LENGTH, normalizeVehicle } from '../../validators/text'

/**
 * The vehicle box. While the driver types, the box shows exactly what they typed (a trailing space must survive) and what is
 * stored is the cleaned version. If the stored value changes from outside the box, the box shows that instead.
 */
export function VehicleField() {
  const { vehicle, setVehicle, clearVehicle } = usePreferences()
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft !== null && normalizeVehicle(draft) === vehicle ? draft : vehicle

  return (
    <TextField
      label={content.vehicle.label}
      value={text}
      placeholder={content.vehicle.placeholder}
      hint={content.vehicle.hint}
      maxLength={MAX_VEHICLE_LENGTH}
      clearLabel={content.vehicle.clear}
      onChange={(value) => {
        setDraft(value)
        setVehicle(value)
      }}
      onClear={() => {
        setDraft(null)
        clearVehicle()
      }}
    />
  )
}
