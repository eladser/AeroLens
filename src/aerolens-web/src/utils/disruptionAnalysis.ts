import type { WeatherResponse, ForecastDay } from '../lib/api'
import type { Airport } from '../data/airports'
import { AIRPORTS } from '../data/airports'

export interface DisruptionStatus {
  level: 'clear' | 'minor' | 'major' | 'severe'
  message: string
  details: string[]
}

export function findNearbyAirports(lat: number, lon: number, radiusKm: number, limit = 5): Airport[] {
  const airports: Array<{ airport: Airport; distance: number }> = []

  for (const airport of Object.values(AIRPORTS)) {
    const distance = calculateHaversineDistance(lat, lon, airport.lat, airport.lon)

    if (distance <= radiusKm && distance > 10) {
      airports.push({ airport, distance })
    }
  }

  return airports
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(a => a.airport)
}

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function analyzeDisruption(
  weather: WeatherResponse | null,
  forecast: ForecastDay[] | null
): DisruptionStatus {
  const details: string[] = []
  let level: DisruptionStatus['level'] = 'clear'

  if (!weather) {
    return { level: 'clear', message: 'Weather data unavailable', details: [] }
  }

  const description = weather.description.toLowerCase()

  if (description.includes('thunderstorm') || description.includes('hail')) {
    level = 'severe'
    details.push('Active thunderstorm activity in the area')
  }

  if (description.includes('snow') || description.includes('freezing')) {
    if (level !== 'severe') level = 'major'
    details.push('Winter weather conditions present')
  }

  if (weather.windSpeed > 15) {
    if (level === 'clear') level = 'major'
    details.push(`Strong winds at ${Math.round(weather.windSpeed * 1.944)} knots`)
  }

  if (description.includes('fog') || description.includes('mist')) {
    if (level === 'clear') level = 'minor'
    details.push('Reduced visibility due to fog/mist')
  }

  if (description.includes('rain') && !description.includes('heavy')) {
    if (level === 'clear') level = 'minor'
    details.push('Rain in the area')
  }

  if (weather.windSpeed > 8 && weather.windSpeed <= 15) {
    if (level === 'clear') level = 'minor'
    details.push(`Moderate winds at ${Math.round(weather.windSpeed * 1.944)} knots`)
  }

  if (forecast && forecast.length > 1) {
    const tomorrow = forecast[1]
    if (tomorrow) {
      if (tomorrow.precipitationProbability >= 70) {
        details.push(`${tomorrow.precipitationProbability}% precipitation chance tomorrow`)
        if (level === 'clear') level = 'minor'
      }
      if (tomorrow.windSpeedMax > 15) {
        details.push(`Strong winds expected tomorrow (${Math.round(tomorrow.windSpeedMax * 1.944)} kts)`)
        if (level === 'clear') level = 'minor'
      }
    }
  }

  const messages: Record<DisruptionStatus['level'], string> = {
    severe: 'Significant disruptions likely',
    major: 'Potential for flight delays',
    minor: 'Minor delays possible',
    clear: 'Conditions favorable for operations',
  }

  return { level, message: messages[level], details }
}

export function msToKnots(ms: number): number {
  return Math.round(ms * 1.944)
}

export function getDisruptionColor(level: DisruptionStatus['level']): string {
  const colors: Record<DisruptionStatus['level'], string> = {
    clear: '#22c55e',
    minor: '#f59e0b',
    major: '#f97316',
    severe: '#ef4444',
  }
  return colors[level]
}
