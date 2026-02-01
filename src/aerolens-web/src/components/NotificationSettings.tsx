import { useNotifications } from '../hooks/useNotifications'
import type { AlertType } from '../services/notificationService'
import { FocusTrap } from './FocusTrap'
import { ContextualHelp } from './ContextualHelp'

const ALERT_TYPE_INFO: Record<AlertType, { label: string; description: string; icon: string }> = {
  delay_prediction: {
    label: 'Delay Predictions',
    description: 'Get notified when AI predicts your flight will be delayed',
    icon: '🤖',
  },
  status_change: {
    label: 'Status Changes',
    description: 'Flight cancellations, diversions, and other status updates',
    icon: '📢',
  },
  gate_change: {
    label: 'Gate Changes',
    description: 'When your departure gate changes',
    icon: '🚪',
  },
  departure_reminder: {
    label: 'Departure Reminders',
    description: 'Reminder before your flight departs',
    icon: '⏰',
  },
  landing: {
    label: 'Landing Notifications',
    description: 'When your tracked flight lands',
    icon: '🛬',
  },
}

interface Props {
  onClose?: () => void
}

export function NotificationSettings({ onClose }: Props) {
  const {
    prefs,
    isSupported,
    isGranted,
    isDenied,
    requestPermission,
    updatePrefs,
    toggleAlertType,
  } = useNotifications()

  if (!isSupported) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: '#94a3b8',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.5 }} aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
        <p>Push notifications are not supported in this browser.</p>
      </div>
    )
  }

  return (
    <FocusTrap>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-settings-title"
        style={{
          background: 'rgba(30, 41, 59, 0.98)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'rgba(14, 165, 233, 0.1)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 id="notification-settings-title" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f8fafc' }}>
                Notification Settings
              </h2>
              <ContextualHelp
                title="Push Notifications"
                content="Receive real-time alerts about your tracked flights directly to your device, even when the app is closed."
                tips={[
                  'Enable browser notifications first',
                  'Toggle individual alert types on/off',
                  'Set quiet hours to pause alerts',
                ]}
                position="bottom"
              />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Configure your flight alert preferences
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: 'rgba(148, 163, 184, 0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ padding: 24 }}>
        {/* Permission status */}
        {!isGranted && (
          <div style={{
            padding: 16,
            background: isDenied
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(14, 165, 233, 0.1)',
            borderRadius: 12,
            marginBottom: 24,
          }}>
            {isDenied ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6M9 9l6 6" />
                </svg>
                <div>
                  <p style={{ margin: 0, color: '#ef4444', fontSize: 14, fontWeight: 500 }}>
                    Notifications Blocked
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#f87171', fontSize: 13 }}>
                    You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div>
                    <p style={{ margin: 0, color: '#0ea5e9', fontSize: 14, fontWeight: 500 }}>
                      Enable Notifications
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#38bdf8', fontSize: 13 }}>
                      Get real-time alerts for your tracked flights
                    </p>
                  </div>
                </div>
                <button
                  onClick={requestPermission}
                  style={{
                    padding: '10px 20px',
                    background: '#0ea5e9',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Enable
                </button>
              </div>
            )}
          </div>
        )}

        {/* Master toggle */}
        {isGranted && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            background: prefs.enabled
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(148, 163, 184, 0.05)',
            borderRadius: 12,
            marginBottom: 24,
          }}>
            <div>
              <p style={{
                margin: 0,
                color: prefs.enabled ? '#22c55e' : '#94a3b8',
                fontSize: 14,
                fontWeight: 600,
              }}>
                {prefs.enabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                {prefs.enabled
                  ? 'You will receive alerts for your tracked flights'
                  : 'Enable to receive flight alerts'}
              </p>
            </div>
            <button
              onClick={() => updatePrefs({ enabled: !prefs.enabled })}
              style={{
                width: 52,
                height: 28,
                background: prefs.enabled ? '#22c55e' : 'rgba(148, 163, 184, 0.3)',
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 200ms ease',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: 3,
                left: prefs.enabled ? 27 : 3,
                transition: 'left 200ms ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        )}

        {/* Alert types */}
        {isGranted && prefs.enabled && (
          <>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Alert Types
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.keys(ALERT_TYPE_INFO) as AlertType[]).map(alertType => {
                const info = ALERT_TYPE_INFO[alertType]
                const enabled = prefs.alertTypes[alertType]

                return (
                  <div
                    key={alertType}
                    onClick={() => toggleAlertType(alertType)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      background: enabled
                        ? 'rgba(14, 165, 233, 0.05)'
                        : 'rgba(148, 163, 184, 0.03)',
                      border: `1px solid ${enabled ? 'rgba(14, 165, 233, 0.2)' : 'rgba(148, 163, 184, 0.1)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{info.icon}</span>
                      <div>
                        <p style={{
                          margin: 0,
                          color: enabled ? '#f8fafc' : '#94a3b8',
                          fontSize: 14,
                          fontWeight: 500,
                        }}>
                          {info.label}
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          color: '#64748b',
                          fontSize: 12,
                        }}>
                          {info.description}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: enabled ? '#0ea5e9' : 'rgba(148, 163, 184, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 150ms ease',
                    }}>
                      {enabled && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Delay threshold */}
            {prefs.alertTypes.delay_prediction && (
              <div style={{ marginTop: 24 }}>
                <label style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: 13,
                  color: '#94a3b8',
                }}>
                  Minimum delay for predictions: {prefs.delayThresholdMinutes} minutes
                </label>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={prefs.delayThresholdMinutes}
                  onChange={e => updatePrefs({ delayThresholdMinutes: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    accentColor: '#0ea5e9',
                  }}
                />
              </div>
            )}

            {/* Quiet hours */}
            <div style={{ marginTop: 24 }}>
              <div
                onClick={() => updatePrefs({ quietHoursEnabled: !prefs.quietHoursEnabled })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  background: 'rgba(148, 163, 184, 0.03)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🌙</span>
                  <div>
                    <p style={{ margin: 0, color: '#f8fafc', fontSize: 14, fontWeight: 500 }}>
                      Quiet Hours
                    </p>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>
                      Silence non-urgent notifications at night
                    </p>
                  </div>
                </div>
                <div style={{
                  width: 44,
                  height: 24,
                  background: prefs.quietHoursEnabled ? '#8b5cf6' : 'rgba(148, 163, 184, 0.3)',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 200ms ease',
                }}>
                  <div style={{
                    width: 18,
                    height: 18,
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: 3,
                    left: prefs.quietHoursEnabled ? 23 : 3,
                    transition: 'left 200ms ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>

              {prefs.quietHoursEnabled && (
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 12,
                  padding: '0 14px',
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      From
                    </label>
                    <input
                      type="time"
                      value={prefs.quietHoursStart}
                      onChange={e => updatePrefs({ quietHoursStart: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(148, 163, 184, 0.1)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 8,
                        color: '#f8fafc',
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      Until
                    </label>
                    <input
                      type="time"
                      value={prefs.quietHoursEnd}
                      onChange={e => updatePrefs({ quietHoursEnd: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(148, 163, 184, 0.1)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 8,
                        color: '#f8fafc',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </FocusTrap>
  )
}
