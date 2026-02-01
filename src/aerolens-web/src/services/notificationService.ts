export type AlertType =
  | 'delay_prediction'
  | 'status_change'
  | 'gate_change'
  | 'departure_reminder'
  | 'landing'

export interface NotificationData {
  flightId?: string
  callsign?: string
  alertType: AlertType
  actionUrl?: string
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: NotificationData
}

class NotificationService {
  private _permission: NotificationPermission = 'default'

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this._permission = Notification.permission
    }
  }

  get permission(): NotificationPermission {
    return this._permission
  }

  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  get isGranted(): boolean {
    return this._permission === 'granted'
  }

  get isDenied(): boolean {
    return this._permission === 'denied'
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser')
      return false
    }

    if (this.isGranted) {
      return true
    }

    if (this.isDenied) {
      console.warn('Notifications permission was denied')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      this._permission = permission
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  async showNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.isGranted) {
      console.warn('Notification permission not granted')
      return false
    }

    try {
      // Try to use service worker for better reliability
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/logo.png',
          badge: payload.badge || '/favicon.svg',
          tag: payload.tag,
          data: payload.data,
          requireInteraction: payload.data?.alertType === 'delay_prediction',
          // vibrate is supported but not in TS types
          ...({ vibrate: [200, 100, 200] } as NotificationOptions),
        })
        return true
      }

      // Fallback to basic notification
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/logo.png',
        tag: payload.tag,
        data: payload.data,
      })
      return true
    } catch (error) {
      console.error('Error showing notification:', error)
      return false
    }
  }

  // Notification templates for common alert types
  showDelayPrediction(callsign: string, delayMinutes: number, confidence: number, reason: string): Promise<boolean> {
    return this.showNotification({
      title: `Delay Predicted: ${callsign}`,
      body: `Your flight is predicted to be delayed by ${delayMinutes} minutes (${Math.round(confidence * 100)}% confidence). ${reason}`,
      tag: `delay-${callsign}`,
      data: {
        callsign,
        alertType: 'delay_prediction',
        actionUrl: `/?search=${callsign}`,
      },
    })
  }

  showStatusChange(callsign: string, status: string, details?: string): Promise<boolean> {
    return this.showNotification({
      title: `Status Update: ${callsign}`,
      body: details ? `${status}: ${details}` : status,
      tag: `status-${callsign}`,
      data: {
        callsign,
        alertType: 'status_change',
        actionUrl: `/?search=${callsign}`,
      },
    })
  }

  showGateChange(callsign: string, oldGate: string, newGate: string): Promise<boolean> {
    return this.showNotification({
      title: `Gate Change: ${callsign}`,
      body: `Your departure gate has changed from ${oldGate} to ${newGate}`,
      tag: `gate-${callsign}`,
      data: {
        callsign,
        alertType: 'gate_change',
        actionUrl: `/?search=${callsign}`,
      },
    })
  }

  showDepartureReminder(callsign: string, departureTime: string, gate?: string): Promise<boolean> {
    const gateInfo = gate ? ` from Gate ${gate}` : ''
    return this.showNotification({
      title: `Departure Reminder: ${callsign}`,
      body: `Your flight departs at ${departureTime}${gateInfo}. Time to head to the airport!`,
      tag: `departure-${callsign}`,
      data: {
        callsign,
        alertType: 'departure_reminder',
        actionUrl: `/?search=${callsign}`,
      },
    })
  }

  showLanding(callsign: string, airport: string): Promise<boolean> {
    return this.showNotification({
      title: `Flight Landed: ${callsign}`,
      body: `Your flight has landed at ${airport}`,
      tag: `landing-${callsign}`,
      data: {
        callsign,
        alertType: 'landing',
        actionUrl: `/?search=${callsign}`,
      },
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
