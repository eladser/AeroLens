import { useState, useEffect, useCallback, useMemo } from 'react'
import { notificationService, type AlertType } from '../services/notificationService'
import { useAlertPreferences, type AlertPreferences } from './useAlertPreferences'

export interface NotificationPreferences {
  enabled: boolean
  alertTypes: {
    delay_prediction: boolean
    status_change: boolean
    gate_change: boolean
    departure_reminder: boolean
    landing: boolean
  }
  delayThresholdMinutes: number
  departureReminderHours: number
  quietHoursEnabled: boolean
  quietHoursStart: string // HH:MM format
  quietHoursEnd: string
}

// Map AlertPreferences to NotificationPreferences for UI compatibility
function mapToNotificationPrefs(alertPrefs: AlertPreferences): NotificationPreferences {
  return {
    enabled: alertPrefs.push_enabled,
    alertTypes: {
      delay_prediction: alertPrefs.delay_predictions_enabled,
      status_change: alertPrefs.status_changes_enabled,
      gate_change: alertPrefs.gate_changes_enabled,
      departure_reminder: alertPrefs.departure_reminder_enabled,
      landing: alertPrefs.landing_notification_enabled,
    },
    delayThresholdMinutes: alertPrefs.delay_threshold_minutes,
    departureReminderHours: Math.round(alertPrefs.departure_reminder_minutes / 60),
    quietHoursEnabled: alertPrefs.quiet_hours_enabled,
    quietHoursStart: alertPrefs.quiet_hours_start,
    quietHoursEnd: alertPrefs.quiet_hours_end,
  }
}

function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursEnabled) return false

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number)
  const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Handle overnight quiet hours (e.g., 23:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export function useNotifications() {
  // Use the database-backed alert preferences hook
  const {
    preferences: alertPrefs,
    loading: prefsLoading,
    saving: prefsSaving,
    savePreferences: saveAlertPrefs,
  } = useAlertPreferences()

  // Map to NotificationPreferences format for UI compatibility
  const prefs = useMemo(() => mapToNotificationPrefs(alertPrefs), [alertPrefs])

  const [permission, setPermission] = useState<NotificationPermission>(
    notificationService.permission
  )

  // Update permission state when it changes
  useEffect(() => {
    setPermission(notificationService.permission)
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission()
    setPermission(notificationService.permission)
    if (granted) {
      await saveAlertPrefs({ push_enabled: true })
    }
    return granted
  }, [saveAlertPrefs])

  const updatePrefs = useCallback(async (updates: Partial<NotificationPreferences>) => {
    // Map NotificationPreferences updates back to AlertPreferences
    const alertUpdates: Partial<AlertPreferences> = {}

    if (updates.enabled !== undefined) {
      alertUpdates.push_enabled = updates.enabled
    }
    if (updates.delayThresholdMinutes !== undefined) {
      alertUpdates.delay_threshold_minutes = updates.delayThresholdMinutes
    }
    if (updates.departureReminderHours !== undefined) {
      alertUpdates.departure_reminder_minutes = updates.departureReminderHours * 60
    }
    if (updates.quietHoursEnabled !== undefined) {
      alertUpdates.quiet_hours_enabled = updates.quietHoursEnabled
    }
    if (updates.quietHoursStart !== undefined) {
      alertUpdates.quiet_hours_start = updates.quietHoursStart
    }
    if (updates.quietHoursEnd !== undefined) {
      alertUpdates.quiet_hours_end = updates.quietHoursEnd
    }
    if (updates.alertTypes) {
      if (updates.alertTypes.delay_prediction !== undefined) {
        alertUpdates.delay_predictions_enabled = updates.alertTypes.delay_prediction
      }
      if (updates.alertTypes.status_change !== undefined) {
        alertUpdates.status_changes_enabled = updates.alertTypes.status_change
      }
      if (updates.alertTypes.gate_change !== undefined) {
        alertUpdates.gate_changes_enabled = updates.alertTypes.gate_change
      }
      if (updates.alertTypes.departure_reminder !== undefined) {
        alertUpdates.departure_reminder_enabled = updates.alertTypes.departure_reminder
      }
      if (updates.alertTypes.landing !== undefined) {
        alertUpdates.landing_notification_enabled = updates.alertTypes.landing
      }
    }

    await saveAlertPrefs(alertUpdates)
  }, [saveAlertPrefs])

  const toggleAlertType = useCallback(async (alertType: AlertType) => {
    // Map alert type to AlertPreferences field and toggle
    const fieldMap: Record<AlertType, keyof AlertPreferences> = {
      delay_prediction: 'delay_predictions_enabled',
      status_change: 'status_changes_enabled',
      gate_change: 'gate_changes_enabled',
      departure_reminder: 'departure_reminder_enabled',
      landing: 'landing_notification_enabled',
    }

    const field = fieldMap[alertType]
    const currentValue = alertPrefs[field] as boolean
    await saveAlertPrefs({ [field]: !currentValue })
  }, [alertPrefs, saveAlertPrefs])

  const shouldNotify = useCallback(
    (alertType: AlertType, delayMinutes?: number): boolean => {
      if (!prefs.enabled) return false
      if (!notificationService.isGranted) return false
      if (!prefs.alertTypes[alertType]) return false
      if (isInQuietHours(prefs)) return false

      // For delay predictions, check threshold
      if (
        alertType === 'delay_prediction' &&
        delayMinutes !== undefined &&
        delayMinutes < prefs.delayThresholdMinutes
      ) {
        return false
      }

      return true
    },
    [prefs]
  )

  const notify = useCallback(
    async (
      alertType: AlertType,
      title: string,
      body: string,
      options?: { callsign?: string; delayMinutes?: number }
    ): Promise<boolean> => {
      if (!shouldNotify(alertType, options?.delayMinutes)) {
        return false
      }

      return notificationService.showNotification({
        title,
        body,
        tag: options?.callsign ? `${alertType}-${options.callsign}` : alertType,
        data: {
          alertType,
          callsign: options?.callsign,
        },
      })
    },
    [shouldNotify]
  )

  return {
    // State
    prefs,
    permission,
    isSupported: notificationService.isSupported,
    isGranted: notificationService.isGranted,
    isDenied: notificationService.isDenied,
    loading: prefsLoading,
    saving: prefsSaving,

    // Actions
    requestPermission,
    updatePrefs,
    toggleAlertType,
    shouldNotify,
    notify,

    // Convenience methods
    notifyDelayPrediction: useCallback(
      (callsign: string, delayMinutes: number, confidence: number, reason: string) => {
        if (!shouldNotify('delay_prediction', delayMinutes)) return Promise.resolve(false)
        return notificationService.showDelayPrediction(callsign, delayMinutes, confidence, reason)
      },
      [shouldNotify]
    ),
    notifyStatusChange: useCallback(
      (callsign: string, status: string, details?: string) => {
        if (!shouldNotify('status_change')) return Promise.resolve(false)
        return notificationService.showStatusChange(callsign, status, details)
      },
      [shouldNotify]
    ),
    notifyGateChange: useCallback(
      (callsign: string, oldGate: string, newGate: string) => {
        if (!shouldNotify('gate_change')) return Promise.resolve(false)
        return notificationService.showGateChange(callsign, oldGate, newGate)
      },
      [shouldNotify]
    ),
  }
}
