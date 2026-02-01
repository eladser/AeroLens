import { useEffect, useState, useMemo, useRef } from 'react'
import { getWeather, type WeatherResponse } from '../lib/api'
import { WeatherSkeleton } from './Skeleton'

interface Props {
  lat: number
  lon: number
}

// Round coordinates to 2 decimal places (~1.1km precision) to prevent
// excessive API calls when aircraft positions update frequently
function roundCoord(coord: number): number {
  return Math.round(coord * 100) / 100
}

export function WeatherBadge({ lat, lon }: Props) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)

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

    async function fetchWeather() {
      lastFetchRef.current = Date.now()
      setLoading(true)
      try {
        const data = await getWeather(stableLat, stableLon)
        if (!cancelled) setWeather(data)
      } catch {
        // Weather is optional, fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWeather()
    return () => { cancelled = true }
  }, [stableLat, stableLon])

  if (loading) {
    return <WeatherSkeleton />
  }

  if (!weather) {
    return (
      <div style={{ color: '#64748b', fontSize: 13 }}>
        Weather unavailable
      </div>
    )
  }

  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}.png`

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <img src={iconUrl} alt={weather.description} style={{ width: 40, height: 40 }} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#f8fafc',
        }}>
          {Math.round(weather.temp)}°C
        </div>
        <div style={{
          fontSize: 12,
          color: '#94a3b8',
          textTransform: 'capitalize',
        }}>
          {weather.description}
        </div>
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: 11,
        color: '#64748b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
          </svg>
          {Math.round(weather.windSpeed)} m/s
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          {weather.humidity}%
        </div>
      </div>
    </div>
  )
}
