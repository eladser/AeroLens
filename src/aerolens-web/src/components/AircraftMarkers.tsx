import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Aircraft } from '../types/aircraft'
import { useAircraftSignalR } from '../hooks/useAircraftSignalR'
import { useInterpolatedAircraft } from '../hooks/useInterpolatedAircraft'
import { categorizeAircraft, type AircraftFilterState } from './AircraftFilter'
import { HeatmapLayer } from './HeatmapLayer'

const MAX_MARKERS = 2000
const MIN_ZOOM = 3
const TOOLTIP_ZOOM = 8
const POSITION_THRESHOLD = 0.0001 // ~11 meters
const HEADING_THRESHOLD = 5

interface MarkerState {
  lat: number
  lon: number
  heading: number | null
  onGround: boolean
  tooltipKey: string
}

function getTooltipKey(a: Aircraft): string {
  const alt = a.altitude ? Math.round(a.altitude * 3.281) : 0
  const spd = a.velocity ? Math.round(a.velocity * 1.944) : 0
  return `${a.callsign || ''}-${a.onGround}-${alt}-${spd}`
}

const AIRLINES: Record<string, string> = {
  AAL: 'American', UAL: 'United', DAL: 'Delta',
  SWA: 'Southwest', JBU: 'JetBlue', BAW: 'British Airways',
  AFR: 'Air France', DLH: 'Lufthansa', UAE: 'Emirates',
  QTR: 'Qatar', RYR: 'Ryanair', EZY: 'easyJet',
}

function getAirline(callsign: string | null): string | null {
  if (!callsign || callsign.length < 3) return null
  return AIRLINES[callsign.substring(0, 3).toUpperCase()] || null
}

const iconCache = new Map<string, L.DivIcon>()

function getAircraftIcon(heading: number | null, selected: boolean, onGround: boolean): L.DivIcon {
  const rotation = Math.round((heading ?? 0) / 15) * 15
  const key = `${rotation}-${selected}-${onGround}`

  if (!iconCache.has(key)) {
    const color = selected ? '#ef4444' : onGround ? '#64748b' : '#0ea5e9'
    const size = selected ? 28 : 22
    const opacity = onGround ? 0.7 : 1
    const glow = selected ? `filter:drop-shadow(0 0 6px ${color});` : ''

    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${rotation}deg);opacity:${opacity};${glow}">
      <path fill="${color}" d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>`

    iconCache.set(key, L.divIcon({
      className: 'aircraft-marker',
      html: svg,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    }))
  }

  return iconCache.get(key)!
}

function createTooltipContent(a: Aircraft): string {
  const airline = getAirline(a.callsign)
  const altitude = a.altitude ? Math.round(a.altitude * 3.281) : null
  const speed = a.velocity ? Math.round(a.velocity * 1.944) : null

  return `
    <div style="
      background: rgba(30, 41, 59, 0.98);
      backdrop-filter: blur(12px);
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      min-width: 140px;
    ">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-weight: 600; color: #f8fafc; font-size: 14px;">
          ${a.callsign || a.icao24}
        </span>
        <span style="
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 999px;
          background: ${a.onGround ? 'rgba(148, 163, 184, 0.15)' : 'rgba(34, 197, 94, 0.15)'};
          color: ${a.onGround ? '#94a3b8' : '#22c55e'};
          font-weight: 500;
        ">
          ${a.onGround ? 'GND' : 'AIR'}
        </span>
      </div>
      <div style="font-size: 11px; color: #64748b;">
        ${airline ? `<div style="color: #94a3b8;">${airline}</div>` : ''}
        ${!a.onGround && altitude ? `<div>${altitude.toLocaleString()} ft ${speed ? `· ${speed} kts` : ''}</div>` : ''}
        ${a.onGround ? '<div>On ground</div>' : ''}
      </div>
    </div>
  `
}

interface Props {
  onSelect: (aircraft: Aircraft | null) => void
  selectedId: string | null
  onDataUpdate: (count: number, timestamp: Date | null, connected: boolean) => void
  onSelectedUpdate?: (aircraft: Aircraft) => void
  filters?: AircraftFilterState
  showHeatmap?: boolean
}

export function AircraftMarkers({ onSelect, selectedId, onDataUpdate, onSelectedUpdate, filters, showHeatmap = false }: Props) {
  const map = useMap()
  const { aircraft: rawAircraft, count, timestamp, connected, loading } = useAircraftSignalR()
  const { aircraft: allAircraft } = useInterpolatedAircraft({ aircraft: rawAircraft, enabled: true })
  const [bounds, setBounds] = useState(() => map.getBounds())
  const [zoom, setZoom] = useState(() => map.getZoom())

  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const selectedMarkerRef = useRef<L.Marker | null>(null)
  const aircraftDataRef = useRef<Map<string, Aircraft>>(new Map())
  const markerStateRef = useRef<Map<string, MarkerState>>(new Map())
  const tooltipCacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    onDataUpdate(count, timestamp, connected)
  }, [count, timestamp, connected, onDataUpdate])

  useEffect(() => {
    if (!selectedId || !onSelectedUpdate) return
    const interpolated = allAircraft.find(a => a.icao24 === selectedId)
    if (interpolated) {
      onSelectedUpdate(interpolated)
    }
  }, [allAircraft, selectedId, onSelectedUpdate])

  useEffect(() => {
    function handleMove() {
      setBounds(map.getBounds())
      setZoom(map.getZoom())
    }
    map.on('moveend', handleMove)
    map.on('zoomend', handleMove)
    return () => {
      map.off('moveend', handleMove)
      map.off('zoomend', handleMove)
    }
  }, [map])

  // Initialize simple layer group (no clustering)
  useEffect(() => {
    if (layerGroupRef.current) return

    layerGroupRef.current = L.layerGroup()
    map.addLayer(layerGroupRef.current)

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current)
        layerGroupRef.current = null
      }
    }
  }, [map])

  // Calculate visible aircraft with smart sampling for performance
  const visibleAircraft = useMemo(() => {
    if (zoom < MIN_ZOOM) return []

    // Filter by bounds with padding
    let filtered = allAircraft.filter(a =>
      a.lat >= bounds.getSouth() - 1 &&
      a.lat <= bounds.getNorth() + 1 &&
      a.lon >= bounds.getWest() - 1 &&
      a.lon <= bounds.getEast() + 1
    )

    // Apply category filters if provided
    if (filters) {
      filtered = filtered.filter(a => {
        const category = categorizeAircraft(a.callsign, a.onGround)
        return filters[category]
      })
    }

    // If within limit, return all
    if (filtered.length <= MAX_MARKERS) return filtered

    // Smart sampling: prioritize airborne over ground, and ensure selected is included
    const airborne = filtered.filter(a => !a.onGround)
    const ground = filtered.filter(a => a.onGround)

    // Take more airborne aircraft, fewer ground
    const airborneLimit = Math.min(airborne.length, Math.floor(MAX_MARKERS * 0.8))
    const groundLimit = Math.min(ground.length, MAX_MARKERS - airborneLimit)

    let limited = [
      ...airborne.slice(0, airborneLimit),
      ...ground.slice(0, groundLimit)
    ]

    // Ensure selected aircraft is included
    const selected = filtered.find(a => a.icao24 === selectedId)
    if (selected && !limited.includes(selected)) {
      limited[limited.length - 1] = selected
    }

    return limited
  }, [allAircraft, bounds, zoom, selectedId, filters])

  // Store aircraft data for click handlers
  useEffect(() => {
    aircraftDataRef.current.clear()
    visibleAircraft.forEach(a => {
      aircraftDataRef.current.set(a.icao24, a)
    })
  }, [visibleAircraft])

  // Memoize click handler
  const handleMarkerClick = useCallback((icao24: string) => {
    const aircraft = aircraftDataRef.current.get(icao24)
    if (aircraft) {
      onSelect(aircraft)
    }
  }, [onSelect])

  const showTooltips = zoom >= TOOLTIP_ZOOM

  // Update markers - simpler approach without clustering
  useEffect(() => {
    if (!layerGroupRef.current || zoom < MIN_ZOOM) {
      // Clear all markers when zoomed out
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers()
        markersRef.current.clear()
      }
      if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current)
        selectedMarkerRef.current = null
      }
      return
    }

    const layerGroup = layerGroupRef.current
    const currentMarkers = markersRef.current
    const visibleIds = new Set(visibleAircraft.map(a => a.icao24))

    // Remove markers that are no longer visible
    const toRemove: string[] = []
    currentMarkers.forEach((marker, id) => {
      if (!visibleIds.has(id)) {
        layerGroup.removeLayer(marker)
        toRemove.push(id)
      }
    })
    toRemove.forEach(id => currentMarkers.delete(id))

    // Handle selected marker separately (always on top)
    const selectedAircraft = visibleAircraft.find(a => a.icao24 === selectedId)

    // Remove selected marker from layer group if it exists there
    if (selectedId && currentMarkers.has(selectedId)) {
      const marker = currentMarkers.get(selectedId)!
      layerGroup.removeLayer(marker)
      currentMarkers.delete(selectedId)
    }

    // Update or create selected marker (outside layer group for z-index)
    if (selectedAircraft) {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setLatLng([selectedAircraft.lat, selectedAircraft.lon])
        selectedMarkerRef.current.setIcon(getAircraftIcon(selectedAircraft.heading, true, selectedAircraft.onGround))
        if (showTooltips) {
          const tooltip = selectedMarkerRef.current.getTooltip()
          if (tooltip) {
            tooltip.setContent(createTooltipContent(selectedAircraft))
          }
        }
      } else {
        selectedMarkerRef.current = L.marker([selectedAircraft.lat, selectedAircraft.lon], {
          icon: getAircraftIcon(selectedAircraft.heading, true, selectedAircraft.onGround),
          zIndexOffset: 1000,
          interactive: true,
        })
        selectedMarkerRef.current.on('click', () => handleMarkerClick(selectedAircraft.icao24))
        if (showTooltips) {
          selectedMarkerRef.current.bindTooltip(createTooltipContent(selectedAircraft), {
            direction: 'top',
            offset: [0, -12],
            opacity: 1,
            className: 'aircraft-tooltip',
          })
        }
        map.addLayer(selectedMarkerRef.current)
      }
    } else if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current)
      selectedMarkerRef.current = null
    }

    // Add or update markers in layer group
    const markerStates = markerStateRef.current
    const tooltipCache = tooltipCacheRef.current

    visibleAircraft.forEach(a => {
      // Skip selected aircraft (handled separately)
      if (a.icao24 === selectedId) return

      const existingMarker = currentMarkers.get(a.icao24)
      const lastState = markerStates.get(a.icao24)
      const tooltipKey = getTooltipKey(a)

      if (existingMarker && lastState) {
        // Check if position changed enough to warrant an update
        const latDiff = Math.abs(a.lat - lastState.lat)
        const lonDiff = Math.abs(a.lon - lastState.lon)
        const positionChanged = latDiff > POSITION_THRESHOLD || lonDiff > POSITION_THRESHOLD

        // Check if heading changed enough
        const headingDiff = lastState.heading !== null && a.heading !== null
          ? Math.abs(a.heading - lastState.heading)
          : a.heading !== lastState.heading ? 999 : 0
        const headingChanged = headingDiff > HEADING_THRESHOLD
        const groundStateChanged = a.onGround !== lastState.onGround

        // Only update position if it changed significantly
        if (positionChanged) {
          existingMarker.setLatLng([a.lat, a.lon])
        }

        // Only update icon if heading or ground state changed
        if (headingChanged || groundStateChanged) {
          existingMarker.setIcon(getAircraftIcon(a.heading, false, a.onGround))
        }

        // Update tooltip only if tooltip-relevant data changed
        if (showTooltips) {
          const tooltip = existingMarker.getTooltip()
          const tooltipDataChanged = tooltipKey !== lastState.tooltipKey

          if (tooltip) {
            if (tooltipDataChanged) {
              // Get cached tooltip or create new one
              let content = tooltipCache.get(tooltipKey)
              if (!content) {
                content = createTooltipContent(a)
                tooltipCache.set(tooltipKey, content)
              }
              tooltip.setContent(content)
            }
          } else {
            let content = tooltipCache.get(tooltipKey)
            if (!content) {
              content = createTooltipContent(a)
              tooltipCache.set(tooltipKey, content)
            }
            existingMarker.bindTooltip(content, {
              direction: 'top',
              offset: [0, -12],
              opacity: 1,
              className: 'aircraft-tooltip',
            })
          }
        } else {
          existingMarker.unbindTooltip()
        }

        // Update state tracking
        if (positionChanged || headingChanged || groundStateChanged || tooltipKey !== lastState.tooltipKey) {
          markerStates.set(a.icao24, {
            lat: a.lat,
            lon: a.lon,
            heading: a.heading,
            onGround: a.onGround,
            tooltipKey,
          })
        }
      } else {
        // Create new marker
        const marker = L.marker([a.lat, a.lon], {
          icon: getAircraftIcon(a.heading, false, a.onGround),
          interactive: true,
        })

        // Store icao24 on the marker for click handling
        const icao24 = a.icao24
        marker.on('click', () => handleMarkerClick(icao24))

        if (showTooltips) {
          let content = tooltipCache.get(tooltipKey)
          if (!content) {
            content = createTooltipContent(a)
            tooltipCache.set(tooltipKey, content)
          }
          marker.bindTooltip(content, {
            direction: 'top',
            offset: [0, -12],
            opacity: 1,
            className: 'aircraft-tooltip',
          })
        }

        currentMarkers.set(a.icao24, marker)
        layerGroup.addLayer(marker)

        // Track initial state
        markerStates.set(a.icao24, {
          lat: a.lat,
          lon: a.lon,
          heading: a.heading,
          onGround: a.onGround,
          tooltipKey,
        })
      }
    })

    // Clean up stale state entries (reuse visibleIds from above)
    markerStates.forEach((_, id) => {
      if (!visibleIds.has(id)) {
        markerStates.delete(id)
      }
    })
  }, [visibleAircraft, zoom, selectedId, showTooltips, map, handleMarkerClick])

  // Loading spinner with progress bar
  if (loading) {
    return (
      <div
        className="fade-in"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          padding: '24px 32px',
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          textAlign: 'center',
          minWidth: 220,
        }}
      >
        {/* Animated airplane spinner */}
        <div style={{
          width: 56,
          height: 56,
          margin: '0 auto 16px',
          position: 'relative',
        }}>
          {/* Rotating ring with animated dash */}
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            className="aircraft-spinner-ring"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {/* Background circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="rgba(14, 165, 233, 0.15)"
              strokeWidth="3"
            />
            {/* Animated dash circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeLinecap="round"
              className="aircraft-spinner-dash"
            />
          </svg>
          {/* Center airplane icon with pulse */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="aircraft-spinner-plane"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
            }}
          >
            <path
              fill="#0ea5e9"
              d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            />
          </svg>
        </div>

        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#f8fafc',
          marginBottom: 4,
        }}>
          Loading aircraft data
        </div>
        <div style={{
          fontSize: 12,
          color: '#64748b',
        }}>
          Connecting to live feed...
        </div>
        <div style={{
          fontSize: 11,
          color: '#475569',
          marginTop: 8,
        }}>
          This can take up to 30 seconds
        </div>
      </div>
    )
  }

  if (zoom < MIN_ZOOM) {
    return (
      <div
        className="fade-in"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          padding: '16px 24px',
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          textAlign: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2"
          style={{ marginBottom: 12 }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v6"/>
          <path d="M8 11h6"/>
        </svg>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#f8fafc',
          marginBottom: 4,
        }}>
          Zoom in to see aircraft
        </div>
        <div style={{
          fontSize: 12,
          color: '#64748b',
        }}>
          {count.toLocaleString()} aircraft currently tracked
        </div>
      </div>
    )
  }

  // Markers are managed imperatively via refs
  // Heatmap is rendered via JSX
  return showHeatmap ? <HeatmapLayer aircraft={allAircraft} visible={showHeatmap} /> : null
}
