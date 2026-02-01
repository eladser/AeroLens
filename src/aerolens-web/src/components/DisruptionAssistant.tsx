import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { getWeather, getWeatherForecast, isRateLimitError, type WeatherResponse, type ForecastDay } from '../lib/api'
import { type Airport } from '../data/airports'
import { analyzeDisruption, findNearbyAirports } from '../utils/disruptionAnalysis'

interface Props {
  lat: number
  lon: number
  onAirportSuggest?: (airport: Airport) => void
}

// Round coordinates to 2 decimal places (~1.1km precision) to prevent
// excessive API calls when aircraft positions update frequently
function roundCoord(coord: number): number {
  return Math.round(coord * 100) / 100
}

const levelStyles = {
  clear: {
    bg: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 0.3)',
    text: '#22c55e',
    icon: '#22c55e',
  },
  minor: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#f59e0b',
    icon: '#f59e0b',
  },
  major: {
    bg: 'rgba(249, 115, 22, 0.1)',
    border: 'rgba(249, 115, 22, 0.3)',
    text: '#f97316',
    icon: '#f97316',
  },
  severe: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#ef4444',
    icon: '#ef4444',
  },
}

export function DisruptionAssistant({ lat, lon, onAirportSuggest }: Props) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [rateLimited, setRateLimited] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [nearbyAirports, setNearbyAirports] = useState<Airport[]>([])
  const [hoveredAirport, setHoveredAirport] = useState<string | null>(null)

  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), [])
  const handleAirportMouseEnter = useCallback((icao: string) => setHoveredAirport(icao), [])
  const handleAirportMouseLeave = useCallback(() => setHoveredAirport(null), [])

  const status = useMemo(() => analyzeDisruption(weather, forecast), [weather, forecast])
  const style = levelStyles[status.level]

  // Stabilize coordinates to prevent API spam
  const stableLat = useMemo(() => roundCoord(lat), [Math.round(lat * 100)])
  const stableLon = useMemo(() => roundCoord(lon), [Math.round(lon * 100)])

  // Track last fetch time to enforce minimum interval
  const lastFetchRef = useRef<number>(0)
  const MIN_FETCH_INTERVAL = 30000 // 30 seconds minimum between fetches

  useEffect(() => {
    let cancelled = false

    // Enforce minimum interval between fetches
    const now = Date.now()
    const timeSinceLastFetch = now - lastFetchRef.current
    if (lastFetchRef.current > 0 && timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      return
    }

    async function fetchData() {
      lastFetchRef.current = Date.now()
      setLoading(true)
      setRateLimited(false)

      let weatherData: WeatherResponse | null = null
      let forecastDays: ForecastDay[] | null = null
      let hitRateLimit = false

      try {
        weatherData = await getWeather(stableLat, stableLon)
      } catch (err) {
        if (isRateLimitError(err)) hitRateLimit = true
      }

      try {
        const forecastData = await getWeatherForecast(stableLat, stableLon, 3)
        forecastDays = forecastData?.days ?? null
      } catch (err) {
        if (isRateLimitError(err)) hitRateLimit = true
      }

      if (!cancelled) {
        setWeather(weatherData)
        setForecast(forecastDays)
        setRateLimited(hitRateLimit && !weatherData && !forecastDays)
        setLoading(false)
      }
    }

    fetchData()
    setNearbyAirports(findNearbyAirports(stableLat, stableLon, 300)) // 300km radius

    return () => { cancelled = true }
  }, [stableLat, stableLon])

  if (loading) {
    return (
      <div style={{
        padding: 16,
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        animation: 'pulse 2s infinite',
      }}>
        <div style={{ height: 20, width: '60%', background: 'rgba(148, 163, 184, 0.1)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 14, width: '80%', background: 'rgba(148, 163, 184, 0.1)', borderRadius: 4 }} />
      </div>
    )
  }

  if (rateLimited) {
    return (
      <div style={{
        padding: 16,
        background: 'rgba(148, 163, 184, 0.1)',
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>
              Weather data temporarily unavailable
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              API limit reached. Data will refresh automatically.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: style.bg,
      borderRadius: 12,
      border: `1px solid ${style.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={toggleExpanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status icon */}
          {status.level === 'clear' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : status.level === 'minor' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: style.text }}>
              {status.message}
            </div>
            {status.details.length > 0 && !expanded && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {status.details.length} {status.details.length === 1 ? 'factor' : 'factors'} affecting operations
              </div>
            )}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms' }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Clear conditions summary */}
          {status.level === 'clear' && weather && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Current conditions header */}
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Current Conditions
              </div>

              {/* Weather stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}>
                {/* Temperature */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Temperature</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                      {Math.round(weather.temp)}°C
                    </div>
                  </div>
                </div>

                {/* Feels Like */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                    <path d="M8.5 8.5v.01" />
                    <path d="M16 15.5v.01" />
                    <path d="M12 12v.01" />
                    <path d="M11 17v.01" />
                    <path d="M7 14v.01" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Feels Like</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                      {Math.round(weather.feelsLike)}°C
                    </div>
                  </div>
                </div>

                {/* Wind */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
                    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Wind</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                      {weather.windSpeed.toFixed(0)} m/s
                    </div>
                  </div>
                </div>

                {/* Humidity */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Humidity</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                      {weather.humidity}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Positive message */}
              <div style={{
                padding: 12,
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 8,
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.5,
              }}>
                <span style={{ color: '#22c55e', fontWeight: 500 }}>All clear</span> — Weather conditions are within normal operating parameters. No delays expected due to weather.
              </div>
            </div>
          )}

          {/* Disruption factors */}
          {status.details.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}>
                Contributing Factors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {status.details.map((detail, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: '#f8fafc',
                    }}
                  >
                    <div style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: style.text,
                    }} />
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative airports */}
          {(status.level === 'major' || status.level === 'severe') && nearbyAirports.length > 0 && onAirportSuggest && (
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}>
                Nearby Alternatives
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {nearbyAirports.slice(0, 3).map(airport => {
                  const isHovered = hoveredAirport === airport.icao
                  return (
                    <button
                      key={airport.icao}
                      onClick={() => onAirportSuggest(airport)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        background: isHovered ? 'rgba(14, 165, 233, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                        border: `1px solid ${isHovered ? 'rgba(14, 165, 233, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#f8fafc',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={() => handleAirportMouseEnter(airport.icao)}
                      onMouseLeave={handleAirportMouseLeave}
                    >
                      <span style={{ fontWeight: 600, color: '#0ea5e9' }}>{airport.iata}</span>
                      <span style={{ color: '#94a3b8' }}>{airport.city}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tips */}
          {status.level !== 'clear' && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(30, 41, 59, 0.3)',
              borderRadius: 8,
              fontSize: 12,
              color: '#94a3b8',
            }}>
              <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
                Recommendations
              </div>
              {status.level === 'severe' ? (
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  Consider postponing non-essential travel. Check with your airline for the latest flight status and rebooking options.
                </p>
              ) : status.level === 'major' ? (
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  Allow extra time for travel. Monitor flight status updates and consider flexible booking options.
                </p>
              ) : (
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  Minor delays possible. Check flight status before heading to the airport.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
