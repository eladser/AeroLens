import { describe, it, expect } from 'vitest'
import {
  analyzeDisruption,
  calculateHaversineDistance,
  msToKnots,
  getDisruptionColor,
  type DisruptionStatus,
} from './disruptionAnalysis'
import type { WeatherResponse, ForecastDay } from '../lib/api'

// Helper to create mock weather data
function createMockWeather(overrides: Partial<WeatherResponse> = {}): WeatherResponse {
  return {
    temp: 20,
    feelsLike: 19,
    humidity: 50,
    windSpeed: 5,
    description: 'Clear sky',
    icon: '01d',
    cached: false,
    ...overrides,
  }
}

// Helper to create mock forecast data
function createMockForecast(overrides: Partial<ForecastDay>[] = []): ForecastDay[] {
  const baseForecast: ForecastDay[] = [
    {
      date: '2024-01-15',
      dayName: 'Monday',
      tempMin: 15,
      tempMax: 25,
      precipitationProbability: 10,
      windSpeedMax: 5,
      description: 'Sunny',
      icon: '01d',
    },
    {
      date: '2024-01-16',
      dayName: 'Tuesday',
      tempMin: 14,
      tempMax: 24,
      precipitationProbability: 20,
      windSpeedMax: 6,
      description: 'Partly cloudy',
      icon: '02d',
    },
  ]

  return baseForecast.map((day, index) => ({
    ...day,
    ...(overrides[index] || {}),
  }))
}

describe('analyzeDisruption', () => {
  describe('severe conditions', () => {
    it('returns severe for thunderstorm conditions', () => {
      const weather = createMockWeather({ description: 'Thunderstorm with rain' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('severe')
      expect(result.message).toBe('Significant disruptions likely')
      expect(result.details).toContain('Active thunderstorm activity in the area')
    })

    it('returns severe for hail conditions', () => {
      const weather = createMockWeather({ description: 'Hail storm' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('severe')
      expect(result.details).toContain('Active thunderstorm activity in the area')
    })

    it('is case insensitive for severe conditions', () => {
      const weather = createMockWeather({ description: 'THUNDERSTORM' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('severe')
    })
  })

  describe('major conditions', () => {
    it('returns major for snow conditions', () => {
      const weather = createMockWeather({ description: 'Heavy snow' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('major')
      expect(result.message).toBe('Potential for flight delays')
      expect(result.details).toContain('Winter weather conditions present')
    })

    it('returns major for freezing conditions', () => {
      const weather = createMockWeather({ description: 'Freezing rain' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('major')
      expect(result.details).toContain('Winter weather conditions present')
    })

    it('returns major for strong winds (>15 m/s)', () => {
      const weather = createMockWeather({ windSpeed: 20 })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('major')
      expect(result.details.some(d => d.includes('Strong winds'))).toBe(true)
      expect(result.details.some(d => d.includes('39 knots'))).toBe(true) // 20 * 1.944 ≈ 39
    })

    it('does not downgrade severe to major for snow', () => {
      const weather = createMockWeather({ description: 'Thunderstorm with snow' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('severe')
    })
  })

  describe('minor conditions', () => {
    it('returns minor for fog conditions', () => {
      const weather = createMockWeather({ description: 'Fog' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('minor')
      expect(result.message).toBe('Minor delays possible')
      expect(result.details).toContain('Reduced visibility due to fog/mist')
    })

    it('returns minor for mist conditions', () => {
      const weather = createMockWeather({ description: 'Mist' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('minor')
      expect(result.details).toContain('Reduced visibility due to fog/mist')
    })

    it('returns minor for light rain', () => {
      const weather = createMockWeather({ description: 'Light rain' })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('minor')
      expect(result.details).toContain('Rain in the area')
    })

    it('does not trigger rain detail for heavy rain', () => {
      const weather = createMockWeather({ description: 'Heavy rain' })
      const result = analyzeDisruption(weather, null)

      expect(result.details).not.toContain('Rain in the area')
    })

    it('returns minor for moderate winds (8-15 m/s)', () => {
      const weather = createMockWeather({ windSpeed: 10 })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('minor')
      expect(result.details.some(d => d.includes('Moderate winds'))).toBe(true)
      expect(result.details.some(d => d.includes('19 knots'))).toBe(true) // 10 * 1.944 ≈ 19
    })
  })

  describe('clear conditions', () => {
    it('returns clear for good weather', () => {
      const weather = createMockWeather({ description: 'Clear sky', windSpeed: 5 })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('clear')
      expect(result.message).toBe('Conditions favorable for operations')
      expect(result.details).toHaveLength(0)
    })

    it('returns clear when weather is null', () => {
      const result = analyzeDisruption(null, null)

      expect(result.level).toBe('clear')
      expect(result.message).toBe('Weather data unavailable')
      expect(result.details).toHaveLength(0)
    })
  })

  describe('forecast analysis', () => {
    it('adds detail for high precipitation probability tomorrow', () => {
      const weather = createMockWeather()
      const forecast = createMockForecast([{}, { precipitationProbability: 80 }])
      const result = analyzeDisruption(weather, forecast)

      expect(result.details.some(d => d.includes('80% precipitation chance tomorrow'))).toBe(true)
      expect(result.level).toBe('minor')
    })

    it('adds detail for strong winds tomorrow', () => {
      const weather = createMockWeather()
      const forecast = createMockForecast([{}, { windSpeedMax: 20 }])
      const result = analyzeDisruption(weather, forecast)

      expect(result.details.some(d => d.includes('Strong winds expected tomorrow'))).toBe(true)
      expect(result.level).toBe('minor')
    })

    it('does not upgrade level for forecast issues when already severe', () => {
      const weather = createMockWeather({ description: 'Thunderstorm' })
      const forecast = createMockForecast([{}, { precipitationProbability: 90 }])
      const result = analyzeDisruption(weather, forecast)

      expect(result.level).toBe('severe')
    })

    it('handles null forecast gracefully', () => {
      const weather = createMockWeather()
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('clear')
    })

    it('handles empty forecast array', () => {
      const weather = createMockWeather()
      const result = analyzeDisruption(weather, [])

      expect(result.level).toBe('clear')
    })

    it('handles single-day forecast', () => {
      const weather = createMockWeather()
      const forecast = [createMockForecast()[0]]
      const result = analyzeDisruption(weather, forecast)

      expect(result.level).toBe('clear')
    })
  })

  describe('combined conditions', () => {
    it('accumulates multiple details', () => {
      const weather = createMockWeather({
        description: 'Snow with fog',
        windSpeed: 12,
      })
      const result = analyzeDisruption(weather, null)

      expect(result.level).toBe('major')
      expect(result.details).toContain('Winter weather conditions present')
      expect(result.details).toContain('Reduced visibility due to fog/mist')
      expect(result.details.some(d => d.includes('Moderate winds'))).toBe(true)
    })
  })
})

describe('calculateHaversineDistance', () => {
  it('calculates distance between JFK and LAX correctly', () => {
    // JFK: 40.6413, -73.7781
    // LAX: 33.9425, -118.4081
    const distance = calculateHaversineDistance(40.6413, -73.7781, 33.9425, -118.4081)
    // Actual distance is ~3983 km
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4100)
  })

  it('calculates distance between London and Paris correctly', () => {
    // London Heathrow: 51.4700, -0.4543
    // Paris CDG: 49.0097, 2.5479
    const distance = calculateHaversineDistance(51.4700, -0.4543, 49.0097, 2.5479)
    // Actual distance is ~344 km
    expect(distance).toBeGreaterThan(300)
    expect(distance).toBeLessThan(400)
  })

  it('returns 0 for same coordinates', () => {
    const distance = calculateHaversineDistance(40.6413, -73.7781, 40.6413, -73.7781)
    expect(distance).toBe(0)
  })

  it('handles antipodal points', () => {
    // Distance should be close to half Earth's circumference (~20,000 km)
    const distance = calculateHaversineDistance(0, 0, 0, 180)
    expect(distance).toBeGreaterThan(19000)
    expect(distance).toBeLessThan(21000)
  })

  it('handles negative coordinates', () => {
    // Sydney: -33.8688, 151.2093
    // Auckland: -36.8485, 174.7633
    const distance = calculateHaversineDistance(-33.8688, 151.2093, -36.8485, 174.7633)
    // Actual distance is ~2156 km
    expect(distance).toBeGreaterThan(2000)
    expect(distance).toBeLessThan(2300)
  })

  it('is symmetric (order of points does not matter)', () => {
    const d1 = calculateHaversineDistance(40.6413, -73.7781, 33.9425, -118.4081)
    const d2 = calculateHaversineDistance(33.9425, -118.4081, 40.6413, -73.7781)
    expect(d1).toBeCloseTo(d2, 10)
  })
})

describe('msToKnots', () => {
  it('converts 0 m/s to 0 knots', () => {
    expect(msToKnots(0)).toBe(0)
  })

  it('converts 1 m/s to approximately 2 knots', () => {
    expect(msToKnots(1)).toBe(2) // 1.944 rounds to 2
  })

  it('converts 10 m/s to approximately 19 knots', () => {
    expect(msToKnots(10)).toBe(19) // 19.44 rounds to 19
  })

  it('converts 15 m/s to approximately 29 knots', () => {
    expect(msToKnots(15)).toBe(29) // 29.16 rounds to 29
  })

  it('converts 20 m/s to approximately 39 knots', () => {
    expect(msToKnots(20)).toBe(39) // 38.88 rounds to 39
  })

  it('handles decimal values', () => {
    expect(msToKnots(5.5)).toBe(11) // 10.692 rounds to 11
  })
})

describe('getDisruptionColor', () => {
  it('returns green for clear', () => {
    expect(getDisruptionColor('clear')).toBe('#22c55e')
  })

  it('returns amber for minor', () => {
    expect(getDisruptionColor('minor')).toBe('#f59e0b')
  })

  it('returns orange for major', () => {
    expect(getDisruptionColor('major')).toBe('#f97316')
  })

  it('returns red for severe', () => {
    expect(getDisruptionColor('severe')).toBe('#ef4444')
  })

  it('handles all DisruptionStatus levels', () => {
    const levels: DisruptionStatus['level'][] = ['clear', 'minor', 'major', 'severe']
    levels.forEach(level => {
      const color = getDisruptionColor(level)
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})
