import type { RouteSearch } from './SearchBox'

interface Props {
  route: RouteSearch
  onClose: () => void
}

// Calculate distance between two points in kilometers using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function RouteInfoPanel({ route, onClose }: Props) {
  const distance = calculateDistance(
    route.origin.lat,
    route.origin.lon,
    route.destination.lat,
    route.destination.lon
  )
  const nm = distance * 0.539957 // Nautical miles

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
        border: '1px solid rgba(249, 115, 22, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: '12px 16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {/* Origin */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: '#f97316',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {route.origin.iata}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{route.origin.city}</div>
      </div>

      {/* Route arrow with distance */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 40,
              height: 2,
              background: 'linear-gradient(90deg, #f97316, rgba(249, 115, 22, 0.3))',
              borderRadius: 1,
            }}
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <div
            style={{
              width: 40,
              height: 2,
              background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.3), #f97316)',
              borderRadius: 1,
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {Math.round(nm).toLocaleString()} nm
        </div>
      </div>

      {/* Destination */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: '#f97316',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {route.destination.iata}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{route.destination.city}</div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close route view"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'rgba(148, 163, 184, 0.1)',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 4,
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
          e.currentTarget.style.color = '#ef4444'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
          e.currentTarget.style.color = '#94a3b8'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
