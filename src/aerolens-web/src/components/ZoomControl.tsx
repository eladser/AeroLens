import { useMap } from 'react-leaflet'

export function ZoomControl() {
  const map = useMap()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <button
        onClick={() => map.zoomIn()}
        style={{
          width: 40,
          height: 40,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '10px 10px 4px 4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 20,
          fontWeight: 300,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
          e.currentTarget.style.borderColor = '#0ea5e9'
          e.currentTarget.style.color = '#0ea5e9'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
          e.currentTarget.style.color = '#94a3b8'
        }}
        title="Zoom in (+)"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        style={{
          width: 40,
          height: 40,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '4px 4px 10px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 20,
          fontWeight: 300,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
          e.currentTarget.style.borderColor = '#0ea5e9'
          e.currentTarget.style.color = '#0ea5e9'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
          e.currentTarget.style.color = '#94a3b8'
        }}
        title="Zoom out (-)"
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  )
}
