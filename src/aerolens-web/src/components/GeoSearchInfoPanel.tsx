import { useState, useCallback } from 'react'
import type { GeoSearch } from './SearchBox'

interface Props {
  geoSearch: GeoSearch
  onClose: () => void
}

export function GeoSearchInfoPanel({ geoSearch, onClose }: Props) {
  const [closeHovered, setCloseHovered] = useState(false)
  const handleMouseEnter = useCallback(() => setCloseHovered(true), [])
  const handleMouseLeave = useCallback(() => setCloseHovered(false), [])

  return (
    <div
      className="fade-in"
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(34, 197, 94, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: '12px 16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {/* Location icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(34, 197, 94, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
        </svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: '#f8fafc',
          }}
        >
          {geoSearch.label}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          Showing flights within {geoSearch.radius} km
        </div>
      </div>

      {/* Coordinates badge */}
      <div
        style={{
          background: 'rgba(34, 197, 94, 0.1)',
          padding: '4px 8px',
          borderRadius: 6,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          color: '#22c55e',
        }}
      >
        {geoSearch.lat.toFixed(2)}°, {geoSearch.lon.toFixed(2)}°
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close geographic search"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: closeHovered ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
          border: 'none',
          color: closeHovered ? '#ef4444' : '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 150ms ease',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
