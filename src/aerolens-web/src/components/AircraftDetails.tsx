import { useState, useMemo } from 'react'
import type { Aircraft } from '../types/aircraft'
import { useAuth } from '../contexts/AuthContext'
import { useTrips } from '../hooks/useTrips'
import { useToast } from '../contexts/ToastContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { WeatherBadge } from './WeatherBadge'
import { WeatherForecast } from './WeatherForecast'
import { DisruptionAssistant } from './DisruptionAssistant'
import { DelayPrediction } from './DelayPrediction'
import { FlightPhaseIndicator } from './FlightPhaseIndicator'
import { Tooltip } from './Tooltip'
import {
  getAirlineFromCallsign,
  extractFlightNumber,
  isPrivateFlight,
  getCountryFlag,
} from '../data/airlines'

interface Props {
  aircraft: Aircraft
  onClose: () => void
}

function getCardinalDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

export function AircraftDetails({ aircraft: a, onClose }: Props) {
  const { user } = useAuth()
  const { trips, addFlightToTrip } = useTrips()
  const { showToast } = useToast()
  const { units, setUnits, density, setDensity, formatAltitude, formatSpeed, formatSpeedSecondary, altitudeUnit, speedUnit, spacingMultiplier } = usePreferences()
  const [showTripSelect, setShowTripSelect] = useState(false)
  const [addedTo, setAddedTo] = useState<string | null>(null)
  const [weatherExpanded, setWeatherExpanded] = useState(false)

  async function handleShareFlight() {
    const flightId = a.callsign || a.icao24
    const shareData = {
      title: `Flight ${flightId}`,
      text: `Tracking ${flightId} on AeroLens - ${airline ? airline.name : 'Aircraft'} at ${formatAltitude(a.altitude)} ${altitudeUnit}, ${formatSpeed(a.velocity)} ${speedUnit}`,
      url: window.location.href,
    }

    // Use native share API if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`
    await navigator.clipboard.writeText(shareText)
    showToast('Flight info copied to clipboard', 'success')
  }

  const hdg = a.heading ? Math.round(a.heading) : null

  // Get airline information
  const airline = useMemo(() => getAirlineFromCallsign(a.callsign), [a.callsign])
  const flightNum = useMemo(() => extractFlightNumber(a.callsign), [a.callsign])
  const isPrivate = useMemo(() => isPrivateFlight(a.callsign), [a.callsign])

  async function handleAddToTrip(tripId: string) {
    const callsign = a.callsign || a.icao24
    const { error } = await addFlightToTrip(tripId, callsign)
    if (error) {
      showToast('Failed to add flight to trip', 'error')
    } else {
      const trip = trips.find(t => t.id === tripId)
      setAddedTo(trip?.name ?? 'trip')
      setShowTripSelect(false)
      showToast(`Added ${callsign} to "${trip?.name}"`, 'success')
      setTimeout(() => setAddedTo(null), 2000)
    }
  }

  return (
    <div
      className="slide-up mobile-card"
      role="dialog"
      aria-label={`Flight details for ${a.callsign || a.icao24}`}
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        left: 'auto',
        background: 'var(--color-bg-card)',
        backdropFilter: 'blur(12px)',
        borderRadius: 14,
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-lg)',
        padding: 20 * spacingMultiplier,
        width: density === 'compact' ? 'min(280px, calc(100vw - 40px))' : 'min(320px, calc(100vw - 40px))',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      {/* Header with airline info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
      }}>
        <div style={{ flex: 1 }}>
          {/* Flight identification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Airline icon or plane icon */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: airline
                  ? 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
                  : isPrivate
                    ? 'rgba(148, 163, 184, 0.15)'
                    : 'var(--color-bg-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {airline ? (
                <span style={{ fontSize: 18 }}>{getCountryFlag(airline.country)}</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" aria-hidden="true">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
              )}
            </div>

            <div>
              {/* Main callsign/flight number */}
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text)',
                letterSpacing: '-0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {airline && flightNum ? (
                  <>
                    <span>{airline.iata}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{flightNum}</span>
                  </>
                ) : (
                  a.callsign || a.icao24
                )}
              </div>

              {/* Airline name or aircraft type indicator */}
              <div style={{
                fontSize: 12,
                color: 'var(--color-text-dim)',
                marginTop: 2,
              }}>
                {airline ? airline.name : isPrivate ? 'Private/General Aviation' : `ICAO: ${a.icao24}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {/* Density toggle button */}
          <Tooltip content={density === 'comfortable' ? 'Switch to compact view' : 'Switch to comfortable view'} position="bottom">
            <button
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              aria-label={`Switch to ${density === 'comfortable' ? 'compact' : 'comfortable'} view`}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-border-light)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'
                e.currentTarget.style.color = '#22c55e'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-border-light)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {density === 'comfortable' ? (
                  <>
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="4" x2="20" y2="4" />
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="14" x2="20" y2="14" />
                    <line x1="4" y1="19" x2="20" y2="19" />
                  </>
                )}
              </svg>
            </button>
          </Tooltip>

          {/* Unit toggle button */}
          <Tooltip content={units === 'imperial' ? 'Switch to metric (km/h, m)' : 'Switch to imperial (kts, ft)'} position="bottom">
            <button
              onClick={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
              aria-label={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-border-light)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'
                e.currentTarget.style.color = '#8b5cf6'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-border-light)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              {units === 'imperial' ? 'IMP' : 'MET'}
            </button>
          </Tooltip>

          {/* Share button */}
          <Tooltip content="Share flight" position="bottom">
            <button
              onClick={handleShareFlight}
              aria-label="Share flight details"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-border-light)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'
                e.currentTarget.style.color = '#0ea5e9'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-border-light)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </Tooltip>

          {/* Close button */}
          <Tooltip content="Close (Esc)" position="bottom">
            <button
              onClick={onClose}
              aria-label="Close flight details"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-border-light)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: 20,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-border-light)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              ×
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Flight Phase Indicator */}
      <div style={{ marginBottom: 12 }}>
        <FlightPhaseIndicator
          altitude={a.altitude}
          velocity={a.velocity}
          onGround={a.onGround}
        />
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: hdg !== null && !a.onGround ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
        gap: 8 * spacingMultiplier,
        marginBottom: 12 * spacingMultiplier,
      }}>
        {/* Altitude */}
        <div style={{
          padding: `${10 * spacingMultiplier}px ${12 * spacingMultiplier}px`,
          background: 'var(--color-bg-light)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: density === 'compact' ? 9 : 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 * spacingMultiplier }}>
            Altitude
          </div>
          <div style={{ fontSize: density === 'compact' ? 13 : 15, fontWeight: 600, color: 'var(--color-text)' }}>
            {a.onGround ? 'Ground' : `${formatAltitude(a.altitude)} ${altitudeUnit}`}
          </div>
        </div>

        {/* Speed */}
        <div style={{
          padding: `${10 * spacingMultiplier}px ${12 * spacingMultiplier}px`,
          background: 'var(--color-bg-light)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: density === 'compact' ? 9 : 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 * spacingMultiplier }}>
            Speed
          </div>
          <div style={{ fontSize: density === 'compact' ? 13 : 15, fontWeight: 600, color: 'var(--color-text)' }}>
            {formatSpeed(a.velocity)} {speedUnit}
          </div>
          <div style={{ fontSize: density === 'compact' ? 9 : 10, color: 'var(--color-text-dim)', marginTop: 2 }}>
            {formatSpeedSecondary(a.velocity)}
          </div>
        </div>

        {/* Heading - only show when airborne */}
        {!a.onGround && hdg !== null && (
          <div style={{
            padding: `${10 * spacingMultiplier}px ${12 * spacingMultiplier}px`,
            background: 'var(--color-bg-light)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: density === 'compact' ? 9 : 10, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 * spacingMultiplier }}>
              Heading
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                style={{ transform: `rotate(${hdg}deg)` }}
                aria-hidden="true"
              >
                <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="var(--color-primary)" fillOpacity="0.2" />
              </svg>
              {hdg}° {getCardinalDirection(hdg)}
            </div>
          </div>
        )}
      </div>

      {/* Position info */}
      <div style={{
        padding: '8px 12px',
        background: 'var(--color-bg-light)',
        borderRadius: 10,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="2" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace', flex: 1 }}>
          {a.lat.toFixed(4)}°, {a.lon.toFixed(4)}°
        </div>
        <Tooltip content="Copy coordinates" position="top">
          <button
            onClick={async () => {
              const coords = `${a.lat.toFixed(6)}, ${a.lon.toFixed(6)}`
              await navigator.clipboard.writeText(coords)
              showToast('Coordinates copied', 'success', 2000)
            }}
            aria-label="Copy coordinates to clipboard"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              color: 'var(--color-text-dim)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-border-light)'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-dim)'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </Tooltip>
        <Tooltip content="View in Google Maps" position="top">
          <a
            href={`https://www.google.com/maps?q=${a.lat},${a.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View location in Google Maps"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              color: 'var(--color-text-dim)',
              transition: 'all 150ms ease',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-border-light)'
              e.currentTarget.style.color = '#34a853'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-dim)'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </Tooltip>
      </div>

      {/* Weather section - collapsible */}
      <div style={{
        background: 'var(--color-bg-light)',
        borderRadius: 10,
        marginBottom: 12,
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setWeatherExpanded(!weatherExpanded)}
          style={{
            width: '100%',
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
            </svg>
            Weather at Location
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-dim)"
            strokeWidth="2"
            style={{ transform: weatherExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms' }}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        {weatherExpanded && (
          <div style={{ padding: '0 12px 12px' }}>
            <WeatherBadge lat={a.lat} lon={a.lon} />
            <div style={{ marginTop: 12 }}>
              <WeatherForecast lat={a.lat} lon={a.lon} compact />
            </div>
          </div>
        )}
      </div>

      {/* AI Prediction */}
      {!a.onGround && (
        <div style={{
          padding: 12,
          background: 'var(--color-bg-light)',
          borderRadius: 10,
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
              <path d="M20 12a8 8 0 1 0-8 8"/>
            </svg>
            AI Delay Prediction
          </div>
          <DelayPrediction
            lat={a.lat}
            lon={a.lon}
            altitude={a.altitude}
            velocity={a.velocity}
          />
        </div>
      )}

      {/* Disruption Assistant */}
      <div style={{
        padding: 12,
        background: 'var(--color-bg-light)',
        borderRadius: 10,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Disruption Assistant
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 8 }}>
          Weather-based disruption analysis for this location
        </div>
        <DisruptionAssistant lat={a.lat} lon={a.lon} />
      </div>

      {/* ICAO24 identifier - smaller, at bottom */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 0',
        borderTop: '1px solid var(--color-border-light)',
        marginTop: 4,
      }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
          ICAO24: {a.icao24.toUpperCase()}
        </span>
        {airline && (
          <>
            <span style={{ color: 'var(--color-border)' }}>•</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
              {airline.iata}{flightNum}
            </span>
          </>
        )}
      </div>

      {/* Add to trip */}
      {user && (
        <div style={{ marginTop: 8 }}>
          {addedTo ? (
            <div style={{
              padding: 12,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 10,
              color: '#22c55e',
              fontSize: 13,
              textAlign: 'center',
            }}>
              Added to {addedTo}
            </div>
          ) : showTripSelect ? (
            <div>
              {trips.length === 0 ? (
                <div style={{
                  padding: 16,
                  background: 'var(--color-bg-light)',
                  borderRadius: 10,
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    margin: '0 auto 10px',
                    background: 'rgba(14, 165, 233, 0.1)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    marginBottom: 4,
                  }}>
                    No trips yet
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--color-text-dim)',
                  }}>
                    Create a trip from "My Trips" to start tracking
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trips.map(trip => (
                    <button
                      key={trip.id}
                      onClick={() => handleAddToTrip(trip.id)}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--color-bg-light)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
                        e.currentTarget.style.borderColor = 'var(--color-primary)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--color-bg-light)'
                        e.currentTarget.style.borderColor = 'var(--color-border-light)'
                      }}
                    >
                      {trip.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowTripSelect(false)}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-dim)',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTripSelect(true)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(14, 165, 233, 0.1)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add to Trip
            </button>
          )}
        </div>
      )}
    </div>
  )
}
