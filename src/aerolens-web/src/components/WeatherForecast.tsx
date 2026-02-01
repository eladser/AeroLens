import { useEffect, useState, useCallback } from 'react'
import { getWeatherForecast, isRateLimitError, type ForecastDay } from '../lib/api'

interface Props {
  lat: number
  lon: number
  compact?: boolean
}

export function WeatherForecast({ lat, lon, compact = false }: Props) {
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), [])

  useEffect(() => {
    let cancelled = false

    async function fetchForecast() {
      setLoading(true)
      setError(false)
      setRateLimited(false)
      try {
        const data = await getWeatherForecast(lat, lon, 5)
        if (!cancelled) setForecast(data.days)
      } catch (err) {
        if (!cancelled) {
          if (isRateLimitError(err)) {
            setRateLimited(true)
          } else {
            setError(true)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchForecast()
    return () => { cancelled = true }
  }, [lat, lon])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        gap: 8,
        padding: compact ? 8 : 16,
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
      }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: compact ? 60 : 100,
              background: 'rgba(148, 163, 184, 0.1)',
              borderRadius: 8,
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (rateLimited) {
    return (
      <div style={{
        padding: 16,
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
            Forecast temporarily unavailable
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            API limit reached. Will refresh automatically.
          </div>
        </div>
      </div>
    )
  }

  if (error || !forecast || forecast.length === 0) {
    return (
      <div style={{
        padding: 16,
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        color: '#64748b',
        fontSize: 13,
        textAlign: 'center',
      }}>
        Forecast unavailable
      </div>
    )
  }

  const displayForecast = compact && !expanded ? forecast.slice(0, 3) : forecast

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 500,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          </svg>
          5-Day Forecast
        </div>
        {compact && forecast.length > 3 && (
          <button
            onClick={toggleExpanded}
            style={{
              background: 'none',
              border: 'none',
              color: '#0ea5e9',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {expanded ? 'Less' : 'More'}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms' }}
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Forecast days */}
      <div style={{
        display: 'flex',
        gap: 2,
        padding: compact ? '8px 4px' : '12px 8px',
      }}>
        {displayForecast.map((day, i) => {
          const iconUrl = `https://openweathermap.org/img/wn/${day.icon}.png`
          const isToday = i === 0

          return (
            <div
              key={day.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: compact ? 4 : 8,
                padding: compact ? '8px 4px' : '12px 8px',
                background: isToday ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                borderRadius: 8,
                transition: 'background 150ms ease',
              }}
            >
              {/* Day name */}
              <div style={{
                fontSize: compact ? 10 : 12,
                fontWeight: isToday ? 600 : 500,
                color: isToday ? '#0ea5e9' : '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}>
                {isToday ? 'Today' : day.dayName.slice(0, 3)}
              </div>

              {/* Weather icon */}
              <img
                src={iconUrl}
                alt={day.description}
                style={{
                  width: compact ? 32 : 40,
                  height: compact ? 32 : 40,
                }}
              />

              {/* Temperature */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: compact ? 13 : 15,
                  fontWeight: 600,
                  color: '#f8fafc',
                }}>
                  {Math.round(day.tempMax)}°
                </div>
                <div style={{
                  fontSize: compact ? 11 : 12,
                  color: '#64748b',
                  marginTop: 2,
                }}>
                  {Math.round(day.tempMin)}°
                </div>
              </div>

              {/* Precipitation probability */}
              {!compact && day.precipitationProbability > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: day.precipitationProbability >= 50 ? '#0ea5e9' : '#64748b',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  {day.precipitationProbability}%
                </div>
              )}

              {/* Wind speed (only in non-compact mode) */}
              {!compact && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#64748b',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
                    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
                  </svg>
                  {Math.round(day.windSpeedMax)}m/s
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
