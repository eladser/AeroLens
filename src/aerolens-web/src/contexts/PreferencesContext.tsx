import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type UnitSystem = 'imperial' | 'metric'
export type DisplayDensity = 'compact' | 'comfortable'

interface PreferencesContextValue {
  units: UnitSystem
  setUnits: (units: UnitSystem) => void
  density: DisplayDensity
  setDensity: (density: DisplayDensity) => void
  formatAltitude: (meters: number | null) => string
  formatSpeed: (metersPerSecond: number | null) => string
  formatSpeedSecondary: (metersPerSecond: number | null) => string
  altitudeUnit: string
  speedUnit: string
  speedUnitSecondary: string
  spacingMultiplier: number
  fontSizeMultiplier: number
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

const PREFS_KEY = 'aerolens_preferences'

interface StoredPreferences {
  units: UnitSystem
  density: DisplayDensity
}

function loadPreferences(): StoredPreferences {
  if (typeof window === 'undefined') {
    return { units: 'imperial', density: 'comfortable' }
  }
  try {
    const stored = localStorage.getItem(PREFS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        units: parsed.units || 'imperial',
        density: parsed.density || 'comfortable',
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { units: 'imperial', density: 'comfortable' }
}

function savePreferences(prefs: StoredPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<UnitSystem>(() => loadPreferences().units)
  const [density, setDensityState] = useState<DisplayDensity>(() => loadPreferences().density)

  // Persist preferences when they change
  useEffect(() => {
    savePreferences({ units, density })
  }, [units, density])

  const setUnits = (newUnits: UnitSystem) => {
    setUnitsState(newUnits)
  }

  const setDensity = (newDensity: DisplayDensity) => {
    setDensityState(newDensity)
  }

  // Calculate density-based multipliers
  const spacingMultiplier = density === 'compact' ? 0.75 : 1
  const fontSizeMultiplier = density === 'compact' ? 0.9 : 1

  // Format altitude based on unit preference
  const formatAltitude = (meters: number | null): string => {
    if (meters === null) return '—'
    if (units === 'metric') {
      return `${Math.round(meters).toLocaleString()}`
    }
    // Convert to feet
    const feet = Math.round(meters * 3.28084)
    return `${feet.toLocaleString()}`
  }

  // Format primary speed based on unit preference
  const formatSpeed = (metersPerSecond: number | null): string => {
    if (metersPerSecond === null) return '—'
    if (units === 'metric') {
      // Convert m/s to km/h
      const kmh = Math.round(metersPerSecond * 3.6)
      return `${kmh}`
    }
    // Convert m/s to knots
    const knots = Math.round(metersPerSecond * 1.944)
    return `${knots}`
  }

  // Format secondary speed (shown smaller)
  const formatSpeedSecondary = (metersPerSecond: number | null): string => {
    if (metersPerSecond === null) return '—'
    if (units === 'metric') {
      // Show m/s as secondary
      return `${Math.round(metersPerSecond)} m/s`
    }
    // Show mph as secondary
    const mph = Math.round(metersPerSecond * 2.237)
    return `${mph} mph`
  }

  const value: PreferencesContextValue = {
    units,
    setUnits,
    density,
    setDensity,
    formatAltitude,
    formatSpeed,
    formatSpeedSecondary,
    altitudeUnit: units === 'metric' ? 'm' : 'ft',
    speedUnit: units === 'metric' ? 'km/h' : 'kts',
    speedUnitSecondary: units === 'metric' ? 'm/s' : 'mph',
    spacingMultiplier,
    fontSizeMultiplier,
  }

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}
