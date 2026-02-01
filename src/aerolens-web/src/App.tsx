import { useState, useCallback, useEffect, lazy, Suspense, useMemo } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { FlightMap } from './components/FlightMap'
import { loadFilterPreferences, type AircraftFilterState } from './components/AircraftFilter'
import { AircraftMarkers } from './components/AircraftMarkers'
import { AircraftDetailsResponsive } from './components/AircraftDetailsResponsive'
import { FlightTrail } from './components/FlightTrail'
import { FlightPathProjection } from './components/FlightPathProjection'
import { RouteOverlay } from './components/RouteOverlay'
import { GeoSearchOverlay } from './components/GeoSearchOverlay'
import { RouteInfoPanel } from './components/RouteInfoPanel'
import { GeoSearchInfoPanel } from './components/GeoSearchInfoPanel'
import { StatusBar } from './components/StatusBar'
import { SearchBox, type RouteSearch, type GeoSearch } from './components/SearchBox'
import { Header } from './components/Header'
import { InstallPrompt } from './components/InstallPrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConnectionStatus } from './components/ConnectionStatus'
import { FloatingActionButton } from './components/FloatingActionButton'
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp'
import type { Aircraft } from './types/aircraft'
import type { Airport } from './data/airports'

// Lazy load components that aren't needed on initial render
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })))
const TripsPanel = lazy(() => import('./components/TripsPanel').then(m => ({ default: m.TripsPanel })))
const WelcomeOverlay = lazy(() => import('./components/WelcomeOverlay').then(m => ({ default: m.WelcomeOverlay })))
const HelpButton = lazy(() => import('./components/HelpButton').then(m => ({ default: m.HelpButton })))
const NotificationSettings = lazy(() => import('./components/NotificationSettings').then(m => ({ default: m.NotificationSettings })))
const SessionWarning = lazy(() => import('./components/SessionWarning').then(m => ({ default: m.SessionWarning })))

const WELCOME_KEY = 'aerolens_welcome_shown'

function AppContent() {
  const [selected, setSelected] = useState<Aircraft | null>(null)
  const [count, setCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [connected, setConnected] = useState(false)
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number } | null>(null)
  const [followMode, setFollowMode] = useState(false)
  const [activeRoute, setActiveRoute] = useState<RouteSearch | null>(null)
  const [activeGeoSearch, setActiveGeoSearch] = useState<GeoSearch | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showTrips, setShowTrips] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [aircraftFilters, setAircraftFilters] = useState<AircraftFilterState>(loadFilterPreferences)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()

  // FAB quick actions
  const fabActions = useMemo(() => [
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      ),
      onClick: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      },
    },
    {
      id: 'trips',
      label: 'My Trips',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
      onClick: () => setShowTrips(true),
    },
    {
      id: 'theme',
      label: theme === 'high-contrast' ? 'Standard Theme' : 'High Contrast',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
        </svg>
      ),
      onClick: () => setTheme(theme === 'high-contrast' ? 'system' : 'high-contrast'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      onClick: () => setShowNotifications(true),
    },
  ], [theme, setTheme])

  // Check if this is a new user
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_KEY)
    if (!hasSeenWelcome) {
      setShowWelcome(true)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        if (showAuth) setShowAuth(false)
        else if (showTrips) setShowTrips(false)
        else if (showNotifications) setShowNotifications(false)
        else if (showShortcuts) setShowShortcuts(false)
        else if (showWelcome) {
          localStorage.setItem(WELCOME_KEY, 'true')
          setShowWelcome(false)
        }
        else if (activeRoute) {
          setActiveRoute(null)
        }
        else if (selected) {
          setSelected(null)
          setFollowMode(false)
        }
      }

      // 'F' key to toggle follow mode when aircraft is selected
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && selected) {
        e.preventDefault()
        setFollowMode(prev => {
          const newMode = !prev
          showToast(newMode ? 'Follow mode enabled' : 'Follow mode disabled', 'info', 2000)
          return newMode
        })
      }

      // '?' key to show keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }

      // 'T' key to cycle through themes
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const themeOrder: Array<'system' | 'light' | 'dark' | 'high-contrast'> = ['system', 'light', 'dark', 'high-contrast']
        const themeNames: Record<string, string> = {
          'system': 'System',
          'light': 'Light',
          'dark': 'Dark',
          'high-contrast': 'High Contrast'
        }
        const currentIndex = themeOrder.indexOf(theme as typeof themeOrder[number])
        const nextIndex = (currentIndex + 1) % themeOrder.length
        const nextTheme = themeOrder[nextIndex]
        setTheme(nextTheme)
        showToast(`Theme: ${themeNames[nextTheme]}`, 'info', 2000)
      }

      // 'H' key to toggle heatmap
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowHeatmap(prev => {
          const newValue = !prev
          showToast(newValue ? 'Density heatmap enabled' : 'Density heatmap disabled', 'info', 2000)
          return newValue
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, showAuth, showTrips, showNotifications, showShortcuts, showWelcome, activeRoute, theme, setTheme, showToast])

  const handleDismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, 'true')
    setShowWelcome(false)
  }, [])

  const handleDataUpdate = useCallback((c: number, ts: Date | null, conn: boolean) => {
    setCount(c)
    setLastUpdate(ts)
    setConnected(conn)
  }, [])

  const handleSearch = useCallback((aircraft: Aircraft) => {
    setSelected(aircraft)
    setActiveRoute(null) // Clear route when selecting aircraft
    setActiveGeoSearch(null) // Clear geo search when selecting aircraft
    setFlyTo({ lat: aircraft.lat, lon: aircraft.lon })
    setFollowMode(false) // Start with follow mode off when selecting new aircraft
  }, [])

  const handleAirportSelect = useCallback((airport: Airport) => {
    setSelected(null) // Clear aircraft selection when navigating to airport
    setActiveRoute(null) // Clear route when navigating to airport
    setActiveGeoSearch(null) // Clear geo search when navigating to airport
    setFlyTo({ lat: airport.lat, lon: airport.lon })
    setFollowMode(false)
  }, [])

  const handleRouteSelect = useCallback((route: RouteSearch) => {
    setSelected(null) // Clear aircraft selection when viewing route
    setActiveRoute(route)
    setActiveGeoSearch(null) // Clear geo search when viewing route
    // Calculate center point between origin and destination
    const centerLat = (route.origin.lat + route.destination.lat) / 2
    const centerLon = (route.origin.lon + route.destination.lon) / 2
    setFlyTo({ lat: centerLat, lon: centerLon })
    setFollowMode(false)
    showToast(`Viewing route: ${route.origin.iata} → ${route.destination.iata}`, 'info', 3000)
  }, [showToast])

  const handleGeoSelect = useCallback((geo: GeoSearch) => {
    setSelected(null) // Clear aircraft selection when viewing area
    setActiveRoute(null) // Clear route when viewing area
    setActiveGeoSearch(geo)
    setFlyTo({ lat: geo.lat, lon: geo.lon })
    setFollowMode(false)
    showToast(`${geo.label} (${geo.radius}km radius)`, 'info', 3000)
  }, [showToast])

  const handleFollowModeChange = useCallback((enabled: boolean) => {
    setFollowMode(enabled)
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', background: 'var(--color-bg)' }}>
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Header onSignIn={() => setShowAuth(true)} onTrips={() => setShowTrips(true)} onNotifications={() => setShowNotifications(true)} onShortcuts={() => setShowShortcuts(true)} />

      <main id="main-content" style={{ paddingTop: 64, height: '100%', boxSizing: 'border-box' }}>
        <FlightMap
          flyTo={flyTo}
          followAircraft={selected ? { lat: selected.lat, lon: selected.lon } : null}
          followMode={followMode}
          onFollowModeChange={handleFollowModeChange}
          filters={aircraftFilters}
          onFiltersChange={setAircraftFilters}
          showHeatmap={showHeatmap}
          onHeatmapChange={setShowHeatmap}
        >
          <AircraftMarkers
            onSelect={setSelected}
            selectedId={selected?.icao24 ?? null}
            onDataUpdate={handleDataUpdate}
            onSelectedUpdate={setSelected}
            filters={aircraftFilters}
            showHeatmap={showHeatmap}
          />
          {selected && (
            <>
              <FlightTrail icao24={selected.icao24} />
              <FlightPathProjection aircraft={selected} />
            </>
          )}
          {activeRoute && <RouteOverlay route={activeRoute} />}
          {activeGeoSearch && <GeoSearchOverlay geoSearch={activeGeoSearch} />}
        </FlightMap>
      </main>

      <SearchBox onSelect={handleSearch} onAirportSelect={handleAirportSelect} onRouteSelect={handleRouteSelect} onGeoSelect={handleGeoSelect} />

      {activeRoute && (
        <RouteInfoPanel route={activeRoute} onClose={() => setActiveRoute(null)} />
      )}

      {activeGeoSearch && (
        <GeoSearchInfoPanel geoSearch={activeGeoSearch} onClose={() => setActiveGeoSearch(null)} />
      )}

      {selected && (
        <AircraftDetailsResponsive
          aircraft={selected}
          onClose={() => {
            setSelected(null)
            setFollowMode(false)
          }}
        />
      )}

      <StatusBar count={count} lastUpdate={lastUpdate} connected={connected} />

      <Suspense fallback={null}>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {showTrips && <TripsPanel onClose={() => setShowTrips(false)} />}
        {showNotifications && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: 16,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNotifications(false)
            }}
          >
            <div style={{ width: '100%', maxWidth: 460 }}>
              <NotificationSettings onClose={() => setShowNotifications(false)} />
            </div>
          </div>
        )}
        {showWelcome && <WelcomeOverlay onDismiss={handleDismissWelcome} />}
        <HelpButton />
        <SessionWarning />
      </Suspense>
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <InstallPrompt />
      <ConnectionStatus />
      <FloatingActionButton actions={fabActions} />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
