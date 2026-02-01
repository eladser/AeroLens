import { useEffect, useRef, useState, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface Props {
  visible?: boolean
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  size?: number
  zoomOffset?: number
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export function MiniMap({
  visible = true,
  position = 'bottom-left',
  size = 150,
  zoomOffset = -5,
}: Props) {
  const mainMap = useMap()
  const containerRef = useRef<HTMLDivElement>(null)
  const miniMapRef = useRef<L.Map | null>(null)
  const viewportRectRef = useRef<L.Rectangle | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-left': { bottom: 80, left: 16 },
    'bottom-right': { bottom: 80, right: 80 },
    'top-left': { top: 80, left: 16 },
    'top-right': { top: 80, right: 80 },
  }

  useEffect(() => {
    if (!containerRef.current || !visible || isCollapsed) return

    const miniMap = L.map(containerRef.current, {
      center: mainMap.getCenter(),
      zoom: Math.max(1, mainMap.getZoom() + zoomOffset),
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    })

    L.tileLayer(TILE_URL).addTo(miniMap)

    const bounds = mainMap.getBounds()
    const viewportRect = L.rectangle(bounds, {
      color: '#0ea5e9',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(miniMap)

    miniMapRef.current = miniMap
    viewportRectRef.current = viewportRect

    miniMap.on('click', (e: L.LeafletMouseEvent) => {
      mainMap.flyTo(e.latlng, mainMap.getZoom(), { duration: 0.5 })
    })

    return () => {
      miniMap.remove()
      miniMapRef.current = null
      viewportRectRef.current = null
    }
  }, [mainMap, visible, isCollapsed, zoomOffset])

  useEffect(() => {
    if (!miniMapRef.current || !viewportRectRef.current) return

    function syncMiniMap() {
      const miniMap = miniMapRef.current
      const viewportRect = viewportRectRef.current
      if (!miniMap || !viewportRect) return

      const center = mainMap.getCenter()
      const zoom = Math.max(1, mainMap.getZoom() + zoomOffset)
      const bounds = mainMap.getBounds()

      miniMap.setView(center, zoom, { animate: false })
      viewportRect.setBounds(bounds)
    }

    mainMap.on('move', syncMiniMap)
    mainMap.on('zoom', syncMiniMap)

    syncMiniMap()

    return () => {
      mainMap.off('move', syncMiniMap)
      mainMap.off('zoom', syncMiniMap)
    }
  }, [mainMap, zoomOffset])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: position.includes('right') ? 'flex-end' : 'flex-start',
      }}
    >
      <button
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? 'Show mini-map' : 'Hide mini-map'}
        aria-expanded={!isCollapsed}
        style={{
          width: 32,
          height: 32,
          borderRadius: isCollapsed ? 8 : '8px 8px 0 0',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderBottom: isCollapsed ? undefined : 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms ease',
          marginBottom: isCollapsed ? 0 : -1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 1)'
          e.currentTarget.style.color = '#f8fafc'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
          e.currentTarget.style.color = '#94a3b8'
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          style={{
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      </button>

      {!isCollapsed && (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: position.includes('right') ? '8px 0 8px 8px' : '0 8px 8px 8px',
            overflow: 'hidden',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'pointer',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2L16 10L12 8L8 10L12 2Z"
                fill="#ef4444"
              />
              <path
                d="M12 22L8 14L12 16L16 14L12 22Z"
                fill="#94a3b8"
              />
            </svg>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 4,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 9,
              color: 'rgba(148, 163, 184, 0.7)',
              pointerEvents: 'none',
            }}
          >
            Click to navigate
          </div>
        </div>
      )}
    </div>
  )
}
