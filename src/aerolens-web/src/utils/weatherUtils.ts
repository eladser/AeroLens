export const WMO_WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '01d' },
  1: { description: 'Mainly clear', icon: '02d' },
  2: { description: 'Partly cloudy', icon: '03d' },
  3: { description: 'Overcast', icon: '04d' },
  45: { description: 'Fog', icon: '50d' },
  48: { description: 'Depositing rime fog', icon: '50d' },
  51: { description: 'Light drizzle', icon: '09d' },
  53: { description: 'Moderate drizzle', icon: '09d' },
  55: { description: 'Dense drizzle', icon: '09d' },
  56: { description: 'Light freezing drizzle', icon: '09d' },
  57: { description: 'Dense freezing drizzle', icon: '09d' },
  61: { description: 'Slight rain', icon: '10d' },
  63: { description: 'Moderate rain', icon: '10d' },
  65: { description: 'Heavy rain', icon: '10d' },
  66: { description: 'Light freezing rain', icon: '13d' },
  67: { description: 'Heavy freezing rain', icon: '13d' },
  71: { description: 'Slight snow fall', icon: '13d' },
  73: { description: 'Moderate snow fall', icon: '13d' },
  75: { description: 'Heavy snow fall', icon: '13d' },
  77: { description: 'Snow grains', icon: '13d' },
  80: { description: 'Slight rain showers', icon: '09d' },
  81: { description: 'Moderate rain showers', icon: '09d' },
  82: { description: 'Violent rain showers', icon: '09d' },
  85: { description: 'Slight snow showers', icon: '13d' },
  86: { description: 'Heavy snow showers', icon: '13d' },
  95: { description: 'Thunderstorm', icon: '11d' },
  96: { description: 'Thunderstorm with slight hail', icon: '11d' },
  99: { description: 'Thunderstorm with heavy hail', icon: '11d' },
}

export function getWeatherDescription(code: number): string {
  return WMO_WEATHER_CODES[code]?.description ?? 'Unknown'
}

export function getWeatherIcon(code: number): string {
  return WMO_WEATHER_CODES[code]?.icon ?? '01d'
}

export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  return `${Math.round(temp)}°${unit}`
}

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32)
}

export function convertWindSpeed(ms: number, to: 'knots' | 'mph' | 'kmh'): number {
  switch (to) {
    case 'knots': return Math.round(ms * 1.944)
    case 'mph': return Math.round(ms * 2.237)
    case 'kmh': return Math.round(ms * 3.6)
    default: return Math.round(ms)
  }
}

export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return directions[Math.round(degrees / 22.5) % 16]
}

export function formatVisibility(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`
  return `${Math.round(meters)}m`
}

export function getPressureTrend(current: number, previous: number): 'rising' | 'falling' | 'steady' {
  const diff = current - previous
  if (diff > 1) return 'rising'
  if (diff < -1) return 'falling'
  return 'steady'
}

export function calculateHeatIndex(tempC: number, humidity: number): number {
  if (tempC < 27) return tempC // Only relevant above 27°C (80°F)

  const tempF = (tempC * 9) / 5 + 32
  const hi =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity

  return Math.round(((hi - 32) * 5) / 9)
}

export function getDayName(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}

export function getShortDayName(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

export function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateStr === tomorrow.toISOString().split('T')[0]
}

// FAA flight category thresholds
export type WeatherSeverity = 'vfr' | 'mvfr' | 'ifr' | 'lifr'

export function classifyFlightConditions(visibilityMeters: number, cloudCeilingFeet: number): WeatherSeverity {
  const visibilityMiles = visibilityMeters / 1609.34

  if (visibilityMiles < 1 || cloudCeilingFeet < 500) return 'lifr'
  if (visibilityMiles < 3 || cloudCeilingFeet < 1000) return 'ifr'
  if (visibilityMiles < 5 || cloudCeilingFeet < 3000) return 'mvfr'
  return 'vfr'
}

export function getFlightConditionColor(severity: WeatherSeverity): string {
  const colors: Record<WeatherSeverity, string> = {
    vfr: '#22c55e',
    mvfr: '#0ea5e9',
    ifr: '#ef4444',
    lifr: '#a855f7',
  }
  return colors[severity]
}
