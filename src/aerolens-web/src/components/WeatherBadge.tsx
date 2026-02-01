import { useEffect, useState } from 'react'
import { getWeather, type WeatherResponse } from '../lib/api'
import { WeatherSkeleton } from './Skeleton'

interface Props {
  lat: number
  lon: number
}

export function WeatherBadge({ lat, lon }: Props) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchWeather() {
      setLoading(true)
      try {
        const data = await getWeather(lat, lon)
        if (!cancelled) setWeather(data)
      } catch {
        // Weather is optional, fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWeather()
    return () => { cancelled = true }
  }, [lat, lon])

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
