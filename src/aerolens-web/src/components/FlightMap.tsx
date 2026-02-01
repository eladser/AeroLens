import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ZoomControl } from './ZoomControl'
import { MapThemeToggle, type MapTheme } from './MapThemeToggle'
import { FollowModeButton } from './FollowModeButton'
import { MiniMap } from './MiniMap'
import { DistanceMeasureTool } from './DistanceMeasureTool'
import { AircraftFilter, type AircraftFilterState, loadFilterPreferences } from './AircraftFilter'
import { useToast } from '../contexts/ToastContext'

const THEME_KEY = 'aerolens_map_theme'
const MINIMAP_KEY = 'aerolens_minimap_visible'

// Determine if it's daytime based on local time (6am - 8pm)
function isDaytime(): boolean {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 20
}

// Map tile URLs
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

interface Props {
  children?: React.ReactNode
  flyTo?: { lat: number; lon: number } | null
  followAircraft?: { lat: number; lon: number } | null
  followMode?: boolean
  onFollowModeChange?: (enabled: boolean) => void
  filters?: AircraftFilterState
  onFiltersChange?: (filters: AircraftFilterState) => void
  showHeatmap?: boolean
  onHeatmapChange?: (enabled: boolean) => void
}

function FlyToHandler({ flyTo }: { flyTo?: { lat: number; lon: number } | null }) {
  const map = useMap()

  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lon], 10, { duration: 1.5 })
    }
  }, [map, flyTo])

  return null
}

// Handler to follow the selected aircraft's position
function FollowHandler({ position, enabled }: {
  position?: { lat: number; lon: number } | null
  enabled?: boolean
}) {
  const map = useMap()
  const lastPosition = useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (!enabled || !position) {
      lastPosition.current = null
      return
    }

    // Only pan if position has changed significantly (more than ~100m)
    const hasMovedSignificantly =
      !lastPosition.current ||
      Math.abs(position.lat - lastPosition.current.lat) > 0.001 ||
      Math.abs(position.lon - lastPosition.current.lon) > 0.001

    if (hasMovedSignificantly) {
      // Smooth pan to keep aircraft centered
      map.panTo([position.lat, position.lon], {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.5,
      })
      lastPosition.current = position
    }
  }, [map, position, enabled])

  return null
}

// Keyboard shortcuts for map navigation
function KeyboardHandler({ onToggleMeasureMode, onToggleFilterPanel, onToggleMiniMap, showToast, selectedAircraftPosition }: {
  onToggleMeasureMode?: () => void
  onToggleFilterPanel?: () => void
  onToggleMiniMap?: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number) => void
  selectedAircraftPosition?: { lat: number; lon: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault()
          map.zoomIn()
          break
        case '-':
        case '_':
          e.preventDefault()
          map.zoomOut()
          break
        case 'r':
        case 'R':
          // Reset to default view (center US)
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            map.flyTo([39.8, -98.6], 4, { duration: 1 })
          }
          break
        case 'm':
        case 'M':
          // Toggle measurement mode
          if (!e.ctrlKey && !e.metaKey && onToggleMeasureMode) {
            e.preventDefault()
            onToggleMeasureMode()
          }
          break
        case 'g':
        case 'G':
          // Toggle filter panel
          if (!e.ctrlKey && !e.metaKey && onToggleFilterPanel) {
            e.preventDefault()
            onToggleFilterPanel()
          }
          break
        case 'n':
        case 'N':
          // Toggle mini-map
          if (!e.ctrlKey && !e.metaKey && onToggleMiniMap) {
            e.preventDefault()
            onToggleMiniMap()
          }
          break
        case 'c':
        case 'C':
          // Center on selected aircraft
          if (!e.ctrlKey && !e.metaKey && selectedAircraftPosition) {
            e.preventDefault()
            map.flyTo([selectedAircraftPosition.lat, selectedAircraftPosition.lon], map.getZoom(), { duration: 0.5 })
          }
          break
        case 'l':
        case 'L':
          // Center on user's location
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            if (!navigator.geolocation) {
              showToast?.('Geolocation not supported', 'warning', 3000)
              return
            }
            showToast?.('Locating...', 'info', 2000)
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords
                map.flyTo([latitude, longitude], 10, { duration: 1.5 })
                showToast?.('Centered on your location', 'success', 2000)
              },
              (error) => {
                const messages: Record<number, string> = {
                  1: 'Location permission denied',
                  2: 'Location unavailable',
                  3: 'Location request timed out',
                }
                showToast?.(messages[error.code] || 'Location error', 'error', 3000)
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            )
          }
          break
        case 'ArrowUp':
          if (!e.shiftKey) {
            e.preventDefault()
            map.panBy([0, -100])
          }
          break
        case 'ArrowDown':
          if (!e.shiftKey) {
            e.preventDefault()
            map.panBy([0, 100])
          }
          break
        case 'ArrowLeft':
          if (!e.shiftKey) {
            e.preventDefault()
            map.panBy([-100, 0])
          }
          break
        case 'ArrowRight':
          if (!e.shiftKey) {
            e.preventDefault()
            map.panBy([100, 0])
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [map, onToggleMeasureMode, onToggleFilterPanel, onToggleMiniMap, showToast, selectedAircraftPosition])

  return null
}

// Button to center map on user's location
function LocateUserButton() {
  const map = useMap()
  const { showToast } = useToast()
  const [locating, setLocating] = useState(false)

  const handleLocate = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'warning', 3000)
      return
    }
    setLocating(true)
    showToast('Locating...', 'info', 2000)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        map.flyTo([latitude, longitude], 10, { duration: 1.5 })
        showToast('Centered on your location', 'success', 2000)
        setLocating(false)
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Location permission denied',
          2: 'Location unavailable',
          3: 'Location request timed out',
        }
        showToast(messages[error.code] || 'Location error', 'error', 3000)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <button
      onClick={handleLocate}
      aria-label="Center on your location"
      title="Center on your location (L)"
      disabled={locating}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: locating ? 'rgba(14, 165, 233, 0.2)' : 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        border: locating ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
        color: locating ? '#0ea5e9' : '#94a3b8',
        cursor: locating ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 150ms ease',
        opacity: locating ? 0.7 : 1,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
      </svg>
    </button>
  )
}

// Zoom level indicator
function ZoomLevelIndicator() {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const handleZoom = () => setZoom(Math.round(map.getZoom()))
    map.on('zoomend', handleZoom)
    return () => { map.off('zoomend', handleZoom) }
  }, [map])

  return (
    <div
      style={{
        position: 'absolute',
        left: 20,
        top: 80,
        background: 'rgba(30, 41, 59, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 500,
        color: '#94a3b8',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        zIndex: 1000,
        fontFamily: 'ui-monospace, monospace',
      }}
      aria-label={`Zoom level ${zoom}`}
    >
      Zoom: {zoom}
    </div>
  )
}

// Button to reset map to default view
function ResetViewButton() {
  const map = useMap()
  const { showToast } = useToast()

  const handleReset = () => {
    map.flyTo([39.8, -98.6], 4, { duration: 1 })
    showToast('View reset to default', 'info', 2000)
  }

  return (
    <button
      onClick={handleReset}
      aria-label="Reset to default view"
      title="Reset to default view (R)"
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        color: '#94a3b8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 150ms ease',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  )
}

// Controls rendered inside the map container
function MapControls({ theme, isDay, onThemeChange, followMode, hasSelectedAircraft, onFollowModeChange, showMiniMap, onToggleMiniMap, measureMode, onMeasureModeChange, filters, onFiltersChange, showFilterPanel, onToggleFilterPanel, showHeatmap, onHeatmapChange }: {
  theme: MapTheme
  isDay: boolean
  onThemeChange: (t: MapTheme) => void
  followMode?: boolean
  hasSelectedAircraft?: boolean
  onFollowModeChange?: (enabled: boolean) => void
  showMiniMap: boolean
  onToggleMiniMap: () => void
  measureMode: boolean
  onMeasureModeChange: (active: boolean) => void
  filters: AircraftFilterState
  onFiltersChange: (filters: AircraftFilterState) => void
  showFilterPanel: boolean
  onToggleFilterPanel: () => void
  showHeatmap?: boolean
  onHeatmapChange?: (enabled: boolean) => void
}) {
  const allFiltersActive = Object.values(filters).every(Boolean)
  const someFiltersActive = Object.values(filters).some(Boolean)
  return (
    <>
      <div style={{
        position: 'absolute',
        right: 20,
        bottom: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
      }}>
        <ZoomControl />
        <MapThemeToggle theme={theme} isDay={isDay} onChange={onThemeChange} />
        <LocateUserButton />
        <ResetViewButton />
        {hasSelectedAircraft && onFollowModeChange && (
          <FollowModeButton enabled={followMode || false} onChange={onFollowModeChange} />
        )}
        {/* Filter toggle */}
        <button
          onClick={onToggleFilterPanel}
          aria-label="Filter aircraft"
          aria-pressed={showFilterPanel}
          title="Filter aircraft (G)"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: showFilterPanel || !allFiltersActive
              ? 'rgba(14, 165, 233, 0.2)'
              : 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(12px)',
            border: showFilterPanel || !allFiltersActive
              ? '1px solid rgba(14, 165, 233, 0.4)'
              : '1px solid rgba(148, 163, 184, 0.2)',
            color: showFilterPanel || !allFiltersActive ? '#0ea5e9' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
            position: 'relative',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {/* Indicator when filters are active */}
          {!allFiltersActive && someFiltersActive && (
            <span style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              background: '#0ea5e9',
              borderRadius: '50%',
              border: '2px solid rgba(30, 41, 59, 0.95)',
            }} />
          )}
        </button>
        {/* Measurement tool toggle */}
        <button
          onClick={() => onMeasureModeChange(!measureMode)}
          aria-label={measureMode ? 'Exit measurement mode' : 'Measure distance'}
          aria-pressed={measureMode}
          title={measureMode ? 'Exit measurement mode (M)' : 'Measure distance (M)'}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: measureMode ? 'rgba(14, 165, 233, 0.2)' : 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(12px)',
            border: measureMode ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
            color: measureMode ? '#0ea5e9' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21.3 8.7 8.7 21.3c-.4.4-1 .4-1.4 0l-4.6-4.6c-.4-.4-.4-1 0-1.4L15.3 2.7c.4-.4 1-.4 1.4 0l4.6 4.6c.4.4.4 1 0 1.4z" />
            <path d="m7.5 10.5 2 2" />
            <path d="m10.5 7.5 2 2" />
            <path d="m13.5 4.5 2 2" />
            <path d="m4.5 13.5 2 2" />
          </svg>
        </button>
        {/* Mini-map toggle */}
        <button
          onClick={onToggleMiniMap}
          aria-label={showMiniMap ? 'Hide mini-map' : 'Show mini-map'}
          aria-pressed={showMiniMap}
          title={showMiniMap ? 'Hide mini-map (N)' : 'Show mini-map (N)'}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: showMiniMap ? 'rgba(14, 165, 233, 0.2)' : 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(12px)',
            border: showMiniMap ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
            color: showMiniMap ? '#0ea5e9' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </button>
        {/* Heatmap toggle */}
        {onHeatmapChange && (
          <button
            onClick={() => onHeatmapChange(!showHeatmap)}
            aria-label={showHeatmap ? 'Hide density heatmap' : 'Show density heatmap'}
            aria-pressed={showHeatmap}
            title={showHeatmap ? 'Hide density heatmap (H)' : 'Show density heatmap (H)'}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: showHeatmap ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(12px)',
              border: showHeatmap ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
              color: showHeatmap ? '#f97316' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6" opacity="0.7"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>
      <MiniMap visible={showMiniMap} position="bottom-left" />
      <DistanceMeasureTool active={measureMode} onActiveChange={onMeasureModeChange} />
      <AircraftFilter
        filters={filters}
        onChange={onFiltersChange}
        visible={showFilterPanel}
        onClose={onToggleFilterPanel}
      />
      <ZoomLevelIndicator />
    </>
  )
}

export function FlightMap({ children, flyTo, followAircraft, followMode, onFollowModeChange, filters: externalFilters, onFiltersChange, showHeatmap, onHeatmapChange }: Props) {
  const [isDay, setIsDay] = useState(isDaytime)
  const [theme, setTheme] = useState<MapTheme>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return (saved as MapTheme) || 'auto'
  })
  const [showMiniMap, setShowMiniMap] = useState(() => {
    const saved = localStorage.getItem(MINIMAP_KEY)
    return saved === null ? true : saved === 'true' // Default to visible
  })
  const [measureMode, setMeasureMode] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [internalFilters, setInternalFilters] = useState<AircraftFilterState>(loadFilterPreferences)
  const { showToast } = useToast()

  // Use external filters if provided, otherwise use internal state
  const filters = externalFilters ?? internalFilters
  const handleFiltersChange = onFiltersChange ?? setInternalFilters

  // Check time every minute to update map style
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDay(isDaytime())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Save theme preference
  const handleThemeChange = (t: MapTheme) => {
    setTheme(t)
    localStorage.setItem(THEME_KEY, t)
  }

  // Toggle mini-map visibility
  const handleToggleMiniMap = () => {
    setShowMiniMap(prev => {
      const newValue = !prev
      localStorage.setItem(MINIMAP_KEY, String(newValue))
      return newValue
    })
  }

  // Determine which tiles to use
  const useLightTiles = theme === 'light' || (theme === 'auto' && isDay)
  const tileUrl = useLightTiles ? TILES.light : TILES.dark

  return (
    <MapContainer
      center={[39.8, -98.6]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      preferCanvas={true}
    >
      <TileLayer
        key={useLightTiles ? 'light' : 'dark'}
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      <FlyToHandler flyTo={flyTo} />
      <FollowHandler position={followAircraft} enabled={followMode} />
      <KeyboardHandler
        onToggleMeasureMode={() => setMeasureMode(prev => {
          const newMode = !prev
          showToast(newMode ? 'Measurement mode enabled' : 'Measurement mode disabled', 'info', 2000)
          return newMode
        })}
        onToggleFilterPanel={() => setShowFilterPanel(prev => {
          const newValue = !prev
          showToast(newValue ? 'Filter panel opened' : 'Filter panel closed', 'info', 2000)
          return newValue
        })}
        onToggleMiniMap={() => {
          setShowMiniMap(prev => {
            const newValue = !prev
            localStorage.setItem(MINIMAP_KEY, String(newValue))
            showToast(newValue ? 'Mini-map visible' : 'Mini-map hidden', 'info', 2000)
            return newValue
          })
        }}
        showToast={showToast}
        selectedAircraftPosition={followAircraft}
      />
      <MapControlsWrapper
        theme={theme}
        isDay={isDay}
        onThemeChange={handleThemeChange}
        followMode={followMode}
        hasSelectedAircraft={!!followAircraft}
        onFollowModeChange={onFollowModeChange}
        showMiniMap={showMiniMap}
        onToggleMiniMap={handleToggleMiniMap}
        measureMode={measureMode}
        onMeasureModeChange={setMeasureMode}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showFilterPanel={showFilterPanel}
        onToggleFilterPanel={() => setShowFilterPanel(prev => !prev)}
        showHeatmap={showHeatmap}
        onHeatmapChange={onHeatmapChange}
      />
      {children}
    </MapContainer>
  )
}

// Wrapper to render controls inside MapContainer
function MapControlsWrapper(props: {
  theme: MapTheme
  isDay: boolean
  onThemeChange: (t: MapTheme) => void
  followMode?: boolean
  hasSelectedAircraft?: boolean
  onFollowModeChange?: (enabled: boolean) => void
  showMiniMap: boolean
  onToggleMiniMap: () => void
  measureMode: boolean
  onMeasureModeChange: (active: boolean) => void
  filters: AircraftFilterState
  onFiltersChange: (filters: AircraftFilterState) => void
  showFilterPanel: boolean
  onToggleFilterPanel: () => void
  showHeatmap?: boolean
  onHeatmapChange?: (enabled: boolean) => void
}) {
  return <MapControls {...props} />
}
