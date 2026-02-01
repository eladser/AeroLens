import { useState, useEffect, useRef } from 'react'

interface Props {
  count: number
  lastUpdate: Date | null
  connected: boolean
}

export function StatusBar({ count, lastUpdate, connected }: Props) {
  const [ago, setAgo] = useState<number | null>(null)
  const [countChanged, setCountChanged] = useState(false)
  const prevCountRef = useRef(count)

  // Animate count changes
  useEffect(() => {
    if (prevCountRef.current !== count && prevCountRef.current > 0) {
      setCountChanged(true)
      const timer = setTimeout(() => setCountChanged(false), 300)
      return () => clearTimeout(timer)
    }
    prevCountRef.current = count
  }, [count])

  // Update "ago" every second for live updates
  useEffect(() => {
    function updateAgo() {
      if (lastUpdate) {
        setAgo(Math.round((Date.now() - lastUpdate.getTime()) / 1000))
      } else {
        setAgo(null)
      }
    }

    updateAgo()
    const interval = setInterval(updateAgo, 1000)
    return () => clearInterval(interval)
  }, [lastUpdate])

  // Connection status colors
  const getStatusColor = () => {
    if (!connected) return '#ef4444' // Red - disconnected
    if (ago !== null && ago < 60) return '#22c55e' // Green - live
    return '#f59e0b' // Amber - stale
  }

  const getStatusText = () => {
    if (!connected) return 'Disconnected'
    if (ago === null) return 'Connecting...'
    if (ago < 60) return `Updated ${ago}s ago`
    return `Updated ${Math.floor(ago / 60)}m ago`
  }

  const statusColor = getStatusColor()

  return (
    <div
      role="status"
      aria-label={`${count.toLocaleString()} aircraft tracked. ${getStatusText()}`}
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
      }}
    >
      {/* Connection status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 10,
        border: `1px solid ${connected ? 'rgba(148, 163, 184, 0.1)' : 'rgba(239, 68, 68, 0.3)'}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Status indicator with icon for accessibility (not color alone) */}
        {!connected ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : ago !== null && ago < 60 ? (
          <div
            className="pulse"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 8px ${statusColor}50`,
            }}
          />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          {getStatusText()}
        </span>
      </div>

      {/* Aircraft count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 10,
        border: '1px solid rgba(148, 163, 184, 0.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
        </svg>
        <span style={{
          color: '#f8fafc',
          fontWeight: 600,
          fontSize: 14,
          transition: 'transform 150ms ease, color 150ms ease',
          transform: countChanged ? 'scale(1.1)' : 'scale(1)',
          display: 'inline-block',
        }}>
          {count.toLocaleString()}
        </span>
        <span style={{ color: '#64748b', fontSize: 13 }}>
          aircraft
        </span>
      </div>

      {/* Live indicator with SignalR badge */}
      {connected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 10,
          border: '1px solid rgba(34, 197, 94, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
          <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 500 }}>
            LIVE
          </span>
        </div>
      )}
    </div>
  )
}
