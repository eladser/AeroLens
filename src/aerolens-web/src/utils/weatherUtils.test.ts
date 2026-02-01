import { describe, it, expect } from 'vitest'
import {
  getWeatherDescription,
  getWeatherIcon,
  formatTemperature,
  celsiusToFahrenheit,
  convertWindSpeed,
  getWindDirection,
  formatVisibility,
  getPressureTrend,
  calculateHeatIndex,
  getDayName,
  getShortDayName,
  classifyFlightConditions,
  getFlightConditionColor,
  WMO_WEATHER_CODES,
} from './weatherUtils'

describe('WMO Weather Codes', () => {
  it('has entry for clear sky (code 0)', () => {
    expect(WMO_WEATHER_CODES[0]).toEqual({ description: 'Clear sky', icon: '01d' })
  })

  it('has entry for thunderstorm (code 95)', () => {
    expect(WMO_WEATHER_CODES[95]).toEqual({ description: 'Thunderstorm', icon: '11d' })
  })

  it('has entry for heavy snow (code 75)', () => {
    expect(WMO_WEATHER_CODES[75]).toEqual({ description: 'Heavy snow fall', icon: '13d' })
  })

  it('has entries for all common weather codes', () => {
    const commonCodes = [0, 1, 2, 3, 45, 61, 63, 65, 71, 73, 75, 95]
    commonCodes.forEach(code => {
      expect(WMO_WEATHER_CODES[code]).toBeDefined()
      expect(WMO_WEATHER_CODES[code].description).toBeTruthy()
      expect(WMO_WEATHER_CODES[code].icon).toBeTruthy()
    })
  })
})

describe('getWeatherDescription', () => {
  it('returns description for valid code', () => {
    expect(getWeatherDescription(0)).toBe('Clear sky')
    expect(getWeatherDescription(95)).toBe('Thunderstorm')
  })

  it('returns "Unknown" for invalid code', () => {
    expect(getWeatherDescription(999)).toBe('Unknown')
    expect(getWeatherDescription(-1)).toBe('Unknown')
  })
})

describe('getWeatherIcon', () => {
  it('returns icon for valid code', () => {
    expect(getWeatherIcon(0)).toBe('01d')
    expect(getWeatherIcon(95)).toBe('11d')
  })

  it('returns default icon for invalid code', () => {
    expect(getWeatherIcon(999)).toBe('01d')
  })
})

describe('formatTemperature', () => {
  it('formats temperature in Celsius by default', () => {
    expect(formatTemperature(20)).toBe('20°C')
    expect(formatTemperature(20, 'C')).toBe('20°C')
  })

  it('formats temperature in Fahrenheit', () => {
    expect(formatTemperature(68, 'F')).toBe('68°F')
  })

  it('rounds to nearest integer', () => {
    expect(formatTemperature(20.4)).toBe('20°C')
    expect(formatTemperature(20.6)).toBe('21°C')
  })

  it('handles negative temperatures', () => {
    expect(formatTemperature(-5)).toBe('-5°C')
  })
})

describe('celsiusToFahrenheit', () => {
  it('converts 0°C to 32°F', () => {
    expect(celsiusToFahrenheit(0)).toBe(32)
  })

  it('converts 100°C to 212°F', () => {
    expect(celsiusToFahrenheit(100)).toBe(212)
  })

  it('converts -40°C to -40°F', () => {
    expect(celsiusToFahrenheit(-40)).toBe(-40)
  })

  it('converts 20°C to 68°F', () => {
    expect(celsiusToFahrenheit(20)).toBe(68)
  })
})

describe('convertWindSpeed', () => {
  it('converts m/s to knots', () => {
    expect(convertWindSpeed(10, 'knots')).toBe(19) // 10 * 1.944 ≈ 19
  })

  it('converts m/s to mph', () => {
    expect(convertWindSpeed(10, 'mph')).toBe(22) // 10 * 2.237 ≈ 22
  })

  it('converts m/s to km/h', () => {
    expect(convertWindSpeed(10, 'kmh')).toBe(36) // 10 * 3.6 = 36
  })

  it('handles zero', () => {
    expect(convertWindSpeed(0, 'knots')).toBe(0)
    expect(convertWindSpeed(0, 'mph')).toBe(0)
    expect(convertWindSpeed(0, 'kmh')).toBe(0)
  })
})

describe('getWindDirection', () => {
  it('returns N for 0 degrees', () => {
    expect(getWindDirection(0)).toBe('N')
  })

  it('returns E for 90 degrees', () => {
    expect(getWindDirection(90)).toBe('E')
  })

  it('returns S for 180 degrees', () => {
    expect(getWindDirection(180)).toBe('S')
  })

  it('returns W for 270 degrees', () => {
    expect(getWindDirection(270)).toBe('W')
  })

  it('returns N for 360 degrees', () => {
    expect(getWindDirection(360)).toBe('N')
  })

  it('returns NE for 45 degrees', () => {
    expect(getWindDirection(45)).toBe('NE')
  })

  it('returns SE for 135 degrees', () => {
    expect(getWindDirection(135)).toBe('SE')
  })

  it('returns SW for 225 degrees', () => {
    expect(getWindDirection(225)).toBe('SW')
  })

  it('returns NW for 315 degrees', () => {
    expect(getWindDirection(315)).toBe('NW')
  })
})

describe('formatVisibility', () => {
  it('formats visibility in km for >= 1000m', () => {
    expect(formatVisibility(1000)).toBe('1.0km')
    expect(formatVisibility(5000)).toBe('5.0km')
    expect(formatVisibility(10000)).toBe('10.0km')
  })

  it('formats visibility in m for < 1000m', () => {
    expect(formatVisibility(500)).toBe('500m')
    expect(formatVisibility(100)).toBe('100m')
  })

  it('handles decimal km values', () => {
    expect(formatVisibility(1500)).toBe('1.5km')
    expect(formatVisibility(2300)).toBe('2.3km')
  })
})

describe('getPressureTrend', () => {
  it('returns rising when pressure increased by more than 1', () => {
    expect(getPressureTrend(1015, 1013)).toBe('rising')
    expect(getPressureTrend(1020, 1010)).toBe('rising')
  })

  it('returns falling when pressure decreased by more than 1', () => {
    expect(getPressureTrend(1013, 1015)).toBe('falling')
    expect(getPressureTrend(1010, 1020)).toBe('falling')
  })

  it('returns steady when pressure change is within 1', () => {
    expect(getPressureTrend(1013, 1013)).toBe('steady')
    expect(getPressureTrend(1014, 1013)).toBe('steady')
    expect(getPressureTrend(1013, 1014)).toBe('steady')
  })
})

describe('calculateHeatIndex', () => {
  it('returns same temp for temps below 27°C', () => {
    expect(calculateHeatIndex(20, 50)).toBe(20)
    expect(calculateHeatIndex(25, 80)).toBe(25)
  })

  it('calculates heat index for hot temperatures', () => {
    const hi = calculateHeatIndex(30, 70)
    // Heat index should be higher than actual temp at high humidity
    expect(hi).toBeGreaterThan(30)
  })

  it('increases with humidity at high temps', () => {
    const hi50 = calculateHeatIndex(35, 50)
    const hi90 = calculateHeatIndex(35, 90)
    expect(hi90).toBeGreaterThan(hi50)
  })
})

describe('getDayName', () => {
  it('returns full day name', () => {
    // Use a known date (2024-01-15 is a Monday)
    expect(getDayName('2024-01-15')).toBe('Monday')
    expect(getDayName('2024-01-16')).toBe('Tuesday')
    expect(getDayName('2024-01-21')).toBe('Sunday')
  })
})

describe('getShortDayName', () => {
  it('returns short day name', () => {
    expect(getShortDayName('2024-01-15')).toBe('Mon')
    expect(getShortDayName('2024-01-16')).toBe('Tue')
    expect(getShortDayName('2024-01-21')).toBe('Sun')
  })
})

describe('classifyFlightConditions', () => {
  describe('VFR conditions', () => {
    it('returns vfr for good visibility and high ceiling', () => {
      // 10km visibility, 5000ft ceiling
      expect(classifyFlightConditions(10000, 5000)).toBe('vfr')
    })

    it('returns vfr just above minimum thresholds', () => {
      // Just above 5 miles (~8100m), 3100ft ceiling
      expect(classifyFlightConditions(8100, 3100)).toBe('vfr')
    })
  })

  describe('MVFR conditions', () => {
    it('returns mvfr for reduced visibility', () => {
      // 4 miles = 6437m
      expect(classifyFlightConditions(6437, 5000)).toBe('mvfr')
    })

    it('returns mvfr for lower ceiling', () => {
      // Good visibility but 2000ft ceiling
      expect(classifyFlightConditions(10000, 2000)).toBe('mvfr')
    })
  })

  describe('IFR conditions', () => {
    it('returns ifr for poor visibility', () => {
      // 2 miles = 3218m
      expect(classifyFlightConditions(3218, 5000)).toBe('ifr')
    })

    it('returns ifr for low ceiling', () => {
      // 800ft ceiling
      expect(classifyFlightConditions(10000, 800)).toBe('ifr')
    })
  })

  describe('LIFR conditions', () => {
    it('returns lifr for very poor visibility', () => {
      // 0.5 miles = 804m
      expect(classifyFlightConditions(804, 5000)).toBe('lifr')
    })

    it('returns lifr for very low ceiling', () => {
      // 300ft ceiling
      expect(classifyFlightConditions(10000, 300)).toBe('lifr')
    })

    it('returns lifr when both visibility and ceiling are bad', () => {
      expect(classifyFlightConditions(500, 200)).toBe('lifr')
    })
  })
})

describe('getFlightConditionColor', () => {
  it('returns green for VFR', () => {
    expect(getFlightConditionColor('vfr')).toBe('#22c55e')
  })

  it('returns blue for MVFR', () => {
    expect(getFlightConditionColor('mvfr')).toBe('#0ea5e9')
  })

  it('returns red for IFR', () => {
    expect(getFlightConditionColor('ifr')).toBe('#ef4444')
  })

  it('returns purple for LIFR', () => {
    expect(getFlightConditionColor('lifr')).toBe('#a855f7')
  })
})
