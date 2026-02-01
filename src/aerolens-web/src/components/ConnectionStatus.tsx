import { useEffect, useState } from 'react'

type ConnectionState = 'online' | 'offline' | 'reconnecting'

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('online')
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    function handleOnline() {
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 3000)
      }
      setState('online')
      setWasOffline(false)
    }

    function handleOffline() {
      setState('offline')
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    if (!navigator.onLine) {
      setState('offline')
      setWasOffline(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  // Don't show anything when online and not recently reconnected
  if (state === 'online' && !showReconnected) {
    return null
  }

  return (
    <div
      className="slide-up"
      role="status"
      aria-live="polite"
      aria-label={state === 'offline' ? "You're offline" : showReconnected ? 'Back online' : 'Reconnecting'}
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background:
          state === 'offline'
            ? 'rgba(239, 68, 68, 0.95)'
            : showReconnected
              ? 'rgba(34, 197, 94, 0.95)'
              : 'rgba(245, 158, 11, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: 999,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        color: 'white',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {state === 'offline' && (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
          <span>You're offline</span>
        </>
      )}

      {state === 'reconnecting' && (
        <>
          <div
            className="pulse"
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'white',
            }}
          />
          <span>Reconnecting...</span>
        </>
      )}

      {showReconnected && (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Back online</span>
        </>
      )}
    </div>
  )
}
