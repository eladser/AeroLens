import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface AlertPreferences {
  id?: string
  user_id?: string

  // Notification channels
  push_enabled: boolean
  email_enabled: boolean

  // Alert types
  delay_predictions_enabled: boolean
  delay_threshold_minutes: number
  status_changes_enabled: boolean
  gate_changes_enabled: boolean
  departure_reminder_enabled: boolean
  departure_reminder_minutes: number
  landing_notification_enabled: boolean
  weather_alerts_enabled: boolean

  // Quiet hours
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
}

const DEFAULT_PREFERENCES: AlertPreferences = {
  push_enabled: true,
  email_enabled: false,
  delay_predictions_enabled: true,
  delay_threshold_minutes: 15,
  status_changes_enabled: true,
  gate_changes_enabled: true,
  departure_reminder_enabled: true,
  departure_reminder_minutes: 120,
  landing_notification_enabled: false,
  weather_alerts_enabled: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '23:00',
  quiet_hours_end: '07:00',
}

// Local storage key for non-authenticated users
const LOCAL_STORAGE_KEY = 'aerolens_alert_preferences'

export function useAlertPreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load preferences from Supabase or localStorage
  const loadPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (user) {
      // Authenticated user - load from Supabase
      const { data, error: fetchError } = await supabase
        .from('alert_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No preferences found - create default
          const { data: newData, error: insertError } = await supabase
            .from('alert_preferences')
            .insert({ user_id: user.id, ...DEFAULT_PREFERENCES })
            .select()
            .single()

          if (insertError) {
            console.error('Failed to create default preferences:', insertError)
            setError('Failed to create preferences')
            // Fall back to defaults
            setPreferences(DEFAULT_PREFERENCES)
          } else if (newData) {
            setPreferences(mapDbToPreferences(newData))
          }
        } else {
          console.error('Failed to load preferences:', fetchError)
          setError('Failed to load preferences')
          // Fall back to defaults
          setPreferences(DEFAULT_PREFERENCES)
        }
      } else if (data) {
        setPreferences(mapDbToPreferences(data))
      }
    } else {
      // Not authenticated - load from localStorage
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (stored) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) })
        } else {
          setPreferences(DEFAULT_PREFERENCES)
        }
      } catch {
        setPreferences(DEFAULT_PREFERENCES)
      }
    }

    setLoading(false)
  }, [user])

  // Save preferences to Supabase or localStorage
  const savePreferences = useCallback(async (newPreferences: Partial<AlertPreferences>) => {
    setSaving(true)
    setError(null)

    const updated = { ...preferences, ...newPreferences }

    if (user) {
      // Authenticated user - save to Supabase
      const { error: updateError } = await supabase
        .from('alert_preferences')
        .upsert({
          user_id: user.id,
          push_enabled: updated.push_enabled,
          email_enabled: updated.email_enabled,
          delay_predictions_enabled: updated.delay_predictions_enabled,
          delay_threshold_minutes: updated.delay_threshold_minutes,
          status_changes_enabled: updated.status_changes_enabled,
          gate_changes_enabled: updated.gate_changes_enabled,
          departure_reminder_enabled: updated.departure_reminder_enabled,
          departure_reminder_minutes: updated.departure_reminder_minutes,
          landing_notification_enabled: updated.landing_notification_enabled,
          weather_alerts_enabled: updated.weather_alerts_enabled,
          quiet_hours_enabled: updated.quiet_hours_enabled,
          quiet_hours_start: updated.quiet_hours_start,
          quiet_hours_end: updated.quiet_hours_end,
        })

      if (updateError) {
        console.error('Failed to save preferences:', updateError)
        setError('Failed to save preferences')
        setSaving(false)
        return { error: updateError }
      }
    } else {
      // Not authenticated - save to localStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to save to localStorage:', err)
        setError('Failed to save preferences locally')
        setSaving(false)
        return { error: err }
      }
    }

    setPreferences(updated)
    setSaving(false)
    return { error: null }
  }, [user, preferences])

  // Update a single preference
  const updatePreference = useCallback(async <K extends keyof AlertPreferences>(
    key: K,
    value: AlertPreferences[K]
  ) => {
    return savePreferences({ [key]: value })
  }, [savePreferences])

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    return savePreferences(DEFAULT_PREFERENCES)
  }, [savePreferences])

  // Sync local preferences to Supabase when user logs in
  const syncLocalToCloud = useCallback(async () => {
    if (!user) return

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const localPrefs = JSON.parse(stored)
        await savePreferences(localPrefs)
        // Clear local storage after sync
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    } catch (err) {
      console.error('Failed to sync preferences:', err)
    }
  }, [user, savePreferences])

  // Load preferences on mount and when user changes
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Sync local prefs when user logs in
  useEffect(() => {
    if (user) {
      syncLocalToCloud()
    }
  }, [user, syncLocalToCloud])

  return {
    preferences,
    loading,
    saving,
    error,
    savePreferences,
    updatePreference,
    resetToDefaults,
    reload: loadPreferences,
  }
}

// Helper to map database row to preferences interface
function mapDbToPreferences(data: Record<string, unknown>): AlertPreferences {
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    push_enabled: data.push_enabled as boolean ?? DEFAULT_PREFERENCES.push_enabled,
    email_enabled: data.email_enabled as boolean ?? DEFAULT_PREFERENCES.email_enabled,
    delay_predictions_enabled: data.delay_predictions_enabled as boolean ?? DEFAULT_PREFERENCES.delay_predictions_enabled,
    delay_threshold_minutes: data.delay_threshold_minutes as number ?? DEFAULT_PREFERENCES.delay_threshold_minutes,
    status_changes_enabled: data.status_changes_enabled as boolean ?? DEFAULT_PREFERENCES.status_changes_enabled,
    gate_changes_enabled: data.gate_changes_enabled as boolean ?? DEFAULT_PREFERENCES.gate_changes_enabled,
    departure_reminder_enabled: data.departure_reminder_enabled as boolean ?? DEFAULT_PREFERENCES.departure_reminder_enabled,
    departure_reminder_minutes: data.departure_reminder_minutes as number ?? DEFAULT_PREFERENCES.departure_reminder_minutes,
    landing_notification_enabled: data.landing_notification_enabled as boolean ?? DEFAULT_PREFERENCES.landing_notification_enabled,
    weather_alerts_enabled: data.weather_alerts_enabled as boolean ?? DEFAULT_PREFERENCES.weather_alerts_enabled,
    quiet_hours_enabled: data.quiet_hours_enabled as boolean ?? DEFAULT_PREFERENCES.quiet_hours_enabled,
    quiet_hours_start: data.quiet_hours_start as string ?? DEFAULT_PREFERENCES.quiet_hours_start,
    quiet_hours_end: data.quiet_hours_end as string ?? DEFAULT_PREFERENCES.quiet_hours_end,
  }
}
