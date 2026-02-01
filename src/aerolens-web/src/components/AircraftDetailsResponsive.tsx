import { useState, useEffect, useMemo } from 'react'
import type { Aircraft } from '../types/aircraft'
import { AircraftDetails } from './AircraftDetails'
import { BottomSheet } from './BottomSheet'
import { useAuth } from '../contexts/AuthContext'
import { useTrips } from '../hooks/useTrips'
import { useToast } from '../contexts/ToastContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { WeatherBadge } from './WeatherBadge'
import { WeatherForecast } from './WeatherForecast'
import { DisruptionAssistant } from './DisruptionAssistant'
import { DelayPrediction } from './DelayPrediction'
import { FlightPhaseIndicator } from './FlightPhaseIndicator'
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

const MOBILE_BREAKPOINT = 768

export function AircraftDetailsResponsive({ aircraft, onClose }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        title={`Flight details for ${aircraft.callsign || aircraft.icao24}`}
        maxHeight={85}
      >
        <AircraftDetailsMobileContent aircraft={aircraft} />
      </BottomSheet>
    )
  }

  return <AircraftDetails aircraft={aircraft} onClose={onClose} />
}

/**
 * Mobile-optimized content for the bottom sheet.
 * Removes the outer container styling since BottomSheet provides it.
 */
function getCardinalDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

interface MobileContentProps {
  aircraft: Aircraft
}

function AircraftDetailsMobileContent({ aircraft: a }: MobileContentProps) {
  const { user } = useAuth()
  const { trips, addFlightToTrip } = useTrips()
  const { showToast } = useToast()
  const { units, setUnits, formatAltitude, formatSpeed, formatSpeedSecondary, altitudeUnit, speedUnit } = usePreferences()
  const [showTripSelect, setShowTripSelect] = useState(false)
  const [addedTo, setAddedTo] = useState<string | null>(null)

  const hdg = a.heading ? Math.round(a.heading) : null
  const airline = useMemo(() => getAirlineFromCallsign(a.callsign), [a.callsign])
  const flightNum = useMemo(() => extractFlightNumber(a.callsign), [a.callsign])
  const isPrivate = useMemo(() => isPrivateFlight(a.callsign), [a.callsign])

  async function handleShareFlight() {
    const flightId = a.callsign || a.icao24
    const shareData = {
      title: `Flight ${flightId}`,
      text: `Tracking ${flightId} on AeroLens - ${airline ? airline.name : 'Aircraft'} at ${formatAltitude(a.altitude)} ${altitudeUnit}, ${formatSpeed(a.velocity)} ${speedUnit}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }

    const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`
    await navigator.clipboard.writeText(shareText)
    showToast('Flight info copied to clipboard', 'success')
  }

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
    <div style={{ padding: '0 16px 16px' }}>
      {/* Header with airline info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
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
                <span style={{ fontSize: 22 }}>{getCountryFlag(airline.country)}</span>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" aria-hidden="true">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
              )}
            </div>

            <div>
              <div style={{
                fontSize: 24,
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
              <div style={{
                fontSize: 13,
                color: 'var(--color-text-dim)',
                marginTop: 2,
              }}>
                {airline ? airline.name : isPrivate ? 'Private/General Aviation' : `ICAO: ${a.icao24}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons row */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
      }}>
        <button
          onClick={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
          aria-label={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
          style={{
            flex: 1,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'var(--color-bg-light)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 10,
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
          {units === 'imperial' ? 'Imperial' : 'Metric'}
        </button>

        <button
          onClick={handleShareFlight}
          aria-label="Share flight details"
          style={{
            flex: 1,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: 10,
            cursor: 'pointer',
            color: 'var(--color-primary)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>

      {/* Flight Phase Indicator */}
      <div style={{ marginBottom: 16 }}>
        <FlightPhaseIndicator
          altitude={a.altitude}
          velocity={a.velocity}
          onGround={a.onGround}
        />
      </div>

      {/* Stats Grid - 2 columns on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        marginBottom: 16,
      }}>
        <div style={{
          padding: '14px 16px',
          background: 'var(--color-bg-light)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Altitude
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
            {a.onGround ? 'Ground' : `${formatAltitude(a.altitude)} ${altitudeUnit}`}
          </div>
        </div>

        <div style={{
          padding: '14px 16px',
          background: 'var(--color-bg-light)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Speed
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
            {formatSpeed(a.velocity)} {speedUnit}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>
            {formatSpeedSecondary(a.velocity)}
          </div>
        </div>

        {!a.onGround && hdg !== null && (
          <div style={{
            padding: '14px 16px',
            background: 'var(--color-bg-light)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              Heading
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <svg
                width="16"
                height="16"
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

        <div style={{
          padding: '14px 16px',
          background: 'var(--color-bg-light)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Position
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text)', fontFamily: 'monospace' }}>
            {a.lat.toFixed(4)}°
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text)', fontFamily: 'monospace' }}>
            {a.lon.toFixed(4)}°
          </div>
        </div>
      </div>

      {/* Weather section */}
      <div style={{
        padding: 14,
        background: 'var(--color-bg-light)',
        borderRadius: 12,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 10,
        }}>
          Weather at Location
        </div>
        <WeatherBadge lat={a.lat} lon={a.lon} />
        <div style={{ marginTop: 12 }}>
          <WeatherForecast lat={a.lat} lon={a.lon} compact />
        </div>
      </div>

      {/* AI Prediction */}
      {!a.onGround && (
        <div style={{
          padding: 14,
          background: 'var(--color-bg-light)',
          borderRadius: 12,
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 10,
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
        padding: 14,
        background: 'var(--color-bg-light)',
        borderRadius: 12,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 10,
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
        <DisruptionAssistant lat={a.lat} lon={a.lon} />
      </div>

      {/* ICAO24 identifier */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 0',
        borderTop: '1px solid var(--color-border-light)',
        marginTop: 4,
      }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
          ICAO24: {a.icao24.toUpperCase()}
        </span>
        {airline && (
          <>
            <span style={{ color: 'var(--color-border)' }}>•</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
              {airline.iata}{flightNum}
            </span>
          </>
        )}
      </div>

      {/* Add to trip */}
      {user && (
        <div style={{ marginTop: 12 }}>
          {addedTo ? (
            <div style={{
              padding: 14,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 12,
              color: '#22c55e',
              fontSize: 14,
              textAlign: 'center',
            }}>
              Added to {addedTo}
            </div>
          ) : showTripSelect ? (
            <div>
              {trips.length === 0 ? (
                <div style={{
                  padding: 20,
                  background: 'var(--color-bg-light)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    margin: '0 auto 12px',
                    background: 'rgba(14, 165, 233, 0.1)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    marginBottom: 4,
                  }}>
                    No trips yet
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: 'var(--color-text-dim)',
                  }}>
                    Create a trip from "My Trips" to start tracking
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trips.map(trip => (
                    <button
                      key={trip.id}
                      onClick={() => handleAddToTrip(trip.id)}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--color-bg-light)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 14,
                        color: 'var(--color-text)',
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
                  marginTop: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-dim)',
                  cursor: 'pointer',
                  fontSize: 13,
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
                padding: '14px 16px',
                background: 'rgba(14, 165, 233, 0.1)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
