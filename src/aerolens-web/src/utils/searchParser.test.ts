import { describe, it, expect } from 'vitest'
import {
  parseFlightNumber,
  parseGeoQuery,
  parseRouteQuery,
  isAircraftTypeQuery,
  calculateDistance,
  IATA_TO_ICAO_AIRLINE,
} from './searchParser'

describe('parseFlightNumber', () => {
  describe('IATA to ICAO conversion', () => {
    it('converts UA123 to UAL123', () => {
      expect(parseFlightNumber('UA123')).toBe('UAL123')
    })

    it('converts DL456 to DAL456', () => {
      expect(parseFlightNumber('DL456')).toBe('DAL456')
    })

    it('converts BA1234 to BAW1234', () => {
      expect(parseFlightNumber('BA1234')).toBe('BAW1234')
    })

    it('converts AA100 to AAL100', () => {
      expect(parseFlightNumber('AA100')).toBe('AAL100')
    })

    it('converts lowercase input correctly', () => {
      expect(parseFlightNumber('ua123')).toBe('UAL123')
      expect(parseFlightNumber('dl456')).toBe('DAL456')
    })

    it('handles flight numbers with spaces', () => {
      expect(parseFlightNumber('UA 123')).toBe('UAL123')
      expect(parseFlightNumber('DL 456')).toBe('DAL456')
    })

    it('handles flight numbers with dashes', () => {
      expect(parseFlightNumber('UA-123')).toBe('UAL123')
      expect(parseFlightNumber('DL-456')).toBe('DAL456')
    })
  })

  describe('ICAO codes', () => {
    it('keeps valid ICAO codes as-is', () => {
      expect(parseFlightNumber('AAL123')).toBe('AAL123')
      expect(parseFlightNumber('UAL456')).toBe('UAL456')
      expect(parseFlightNumber('BAW789')).toBe('BAW789')
    })
  })

  describe('edge cases', () => {
    it('returns null for invalid input', () => {
      expect(parseFlightNumber('')).toBeNull()
      expect(parseFlightNumber('123')).toBeNull()
      expect(parseFlightNumber('ABCDE')).toBeNull()
      expect(parseFlightNumber('A1')).toBeNull()
    })

    it('returns null for unknown airline codes', () => {
      expect(parseFlightNumber('XX123')).toBeNull()
      expect(parseFlightNumber('ZZZ123')).toBeNull()
    })

    it('handles whitespace', () => {
      expect(parseFlightNumber('  UA123  ')).toBe('UAL123')
    })

    it('handles single digit flight numbers', () => {
      expect(parseFlightNumber('UA1')).toBe('UAL1')
    })

    it('handles 4 digit flight numbers', () => {
      expect(parseFlightNumber('UA1234')).toBe('UAL1234')
    })

    it('rejects 5 digit flight numbers', () => {
      expect(parseFlightNumber('UA12345')).toBeNull()
    })
  })

  describe('various airlines', () => {
    const testCases: Array<[string, string]> = [
      // North America
      ['WN100', 'SWA100'],   // Southwest
      ['B6200', 'JBU200'],   // JetBlue
      ['AS300', 'ASA300'],   // Alaska
      ['NK400', 'NKS400'],   // Spirit
      ['AC500', 'ACA500'],   // Air Canada
      // Europe
      ['LH600', 'DLH600'],   // Lufthansa
      ['AF700', 'AFR700'],   // Air France
      ['KL800', 'KLM800'],   // KLM
      ['FR900', 'RYR900'],   // Ryanair
      ['U21000', 'EZY1000'], // easyJet
      // Middle East
      ['EK100', 'UAE100'],   // Emirates
      ['QR200', 'QTR200'],   // Qatar
      ['EY300', 'ETD300'],   // Etihad
      // Asia Pacific
      ['SQ400', 'SIA400'],   // Singapore
      ['CX500', 'CPA500'],   // Cathay
      ['NH600', 'ANA600'],   // ANA
      ['JL700', 'JAL700'],   // JAL
      ['QF800', 'QFA800'],   // Qantas
    ]

    testCases.forEach(([input, expected]) => {
      it(`converts ${input} to ${expected}`, () => {
        expect(parseFlightNumber(input)).toBe(expected)
      })
    })
  })
})

describe('IATA_TO_ICAO_AIRLINE', () => {
  it('has all major US carriers', () => {
    expect(IATA_TO_ICAO_AIRLINE['AA']).toBe('AAL')
    expect(IATA_TO_ICAO_AIRLINE['UA']).toBe('UAL')
    expect(IATA_TO_ICAO_AIRLINE['DL']).toBe('DAL')
    expect(IATA_TO_ICAO_AIRLINE['WN']).toBe('SWA')
  })

  it('has major European carriers', () => {
    expect(IATA_TO_ICAO_AIRLINE['BA']).toBe('BAW')
    expect(IATA_TO_ICAO_AIRLINE['LH']).toBe('DLH')
    expect(IATA_TO_ICAO_AIRLINE['AF']).toBe('AFR')
  })

  it('has cargo carriers', () => {
    expect(IATA_TO_ICAO_AIRLINE['FX']).toBe('FDX')
    expect(IATA_TO_ICAO_AIRLINE['5X']).toBe('UPS')
  })
})

describe('parseGeoQuery', () => {
  describe('near me queries', () => {
    it('recognizes "near me"', () => {
      expect(parseGeoQuery('near me')).toEqual({ type: 'near_me' })
    })

    it('recognizes "flights near me"', () => {
      expect(parseGeoQuery('flights near me')).toEqual({ type: 'near_me' })
    })

    it('recognizes "flight near me"', () => {
      expect(parseGeoQuery('flight near me')).toEqual({ type: 'near_me' })
    })

    it('is case insensitive', () => {
      expect(parseGeoQuery('NEAR ME')).toEqual({ type: 'near_me' })
      expect(parseGeoQuery('Near Me')).toEqual({ type: 'near_me' })
    })
  })

  describe('near location queries', () => {
    it('recognizes "near LAX"', () => {
      expect(parseGeoQuery('near LAX')).toEqual({ type: 'near_location', location: 'LAX' })
    })

    it('recognizes "flights near JFK"', () => {
      expect(parseGeoQuery('flights near JFK')).toEqual({ type: 'near_location', location: 'JFK' })
    })

    it('recognizes "around London"', () => {
      expect(parseGeoQuery('around London')).toEqual({ type: 'near_location', location: 'London' })
    })

    it('recognizes "close to Paris"', () => {
      expect(parseGeoQuery('close to Paris')).toEqual({ type: 'near_location', location: 'Paris' })
    })

    it('handles multi-word locations', () => {
      expect(parseGeoQuery('near New York')).toEqual({ type: 'near_location', location: 'New York' })
      expect(parseGeoQuery('around Los Angeles')).toEqual({ type: 'near_location', location: 'Los Angeles' })
    })
  })

  describe('invalid queries', () => {
    it('returns null for non-geo queries', () => {
      expect(parseGeoQuery('UA123')).toBeNull()
      expect(parseGeoQuery('JFK')).toBeNull()
      expect(parseGeoQuery('')).toBeNull()
    })
  })
})

describe('parseRouteQuery', () => {
  describe('valid route queries', () => {
    it('parses "JFK to LAX"', () => {
      expect(parseRouteQuery('JFK to LAX')).toEqual({ origin: 'JFK', destination: 'LAX' })
    })

    it('parses "JFK→LAX"', () => {
      expect(parseRouteQuery('JFK→LAX')).toEqual({ origin: 'JFK', destination: 'LAX' })
    })

    it('parses "JFK->LAX"', () => {
      expect(parseRouteQuery('JFK->LAX')).toEqual({ origin: 'JFK', destination: 'LAX' })
    })

    it('parses "JFK-LAX"', () => {
      expect(parseRouteQuery('JFK-LAX')).toEqual({ origin: 'JFK', destination: 'LAX' })
    })

    it('parses space-separated codes', () => {
      expect(parseRouteQuery('JFK LAX')).toEqual({ origin: 'JFK', destination: 'LAX' })
    })

    it('handles ICAO codes', () => {
      expect(parseRouteQuery('KJFK to KLAX')).toEqual({ origin: 'KJFK', destination: 'KLAX' })
    })

    it('is case insensitive', () => {
      expect(parseRouteQuery('jfk to lax')).toEqual({ origin: 'JFK', destination: 'LAX' })
    })
  })

  describe('invalid route queries', () => {
    it('returns null for short queries', () => {
      expect(parseRouteQuery('JFK')).toBeNull()
      expect(parseRouteQuery('')).toBeNull()
    })

    it('returns null for non-route patterns', () => {
      expect(parseRouteQuery('UA123')).toBeNull()
      expect(parseRouteQuery('near me')).toBeNull()
    })
  })
})

describe('isAircraftTypeQuery', () => {
  describe('valid aircraft types', () => {
    it('recognizes common narrowbody types', () => {
      expect(isAircraftTypeQuery('B737')).toBe(true)
      expect(isAircraftTypeQuery('B738')).toBe(true)
      expect(isAircraftTypeQuery('B739')).toBe(true)
      expect(isAircraftTypeQuery('A320')).toBe(true)
      expect(isAircraftTypeQuery('A321')).toBe(true)
      expect(isAircraftTypeQuery('A319')).toBe(true)
    })

    it('recognizes widebody types', () => {
      expect(isAircraftTypeQuery('B777')).toBe(true)
      expect(isAircraftTypeQuery('B787')).toBe(true)
      expect(isAircraftTypeQuery('A350')).toBe(true)
      expect(isAircraftTypeQuery('A380')).toBe(true)
    })

    it('recognizes regional types', () => {
      expect(isAircraftTypeQuery('E190')).toBe(true)
      expect(isAircraftTypeQuery('E175')).toBe(true)
      expect(isAircraftTypeQuery('CRJ7')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(isAircraftTypeQuery('b737')).toBe(true)
      expect(isAircraftTypeQuery('a320')).toBe(true)
    })
  })

  describe('invalid patterns', () => {
    it('rejects patterns without digits', () => {
      expect(isAircraftTypeQuery('JFK')).toBe(false)
      expect(isAircraftTypeQuery('ABC')).toBe(false)
      expect(isAircraftTypeQuery('')).toBe(false)
    })

    it('rejects patterns starting with digits', () => {
      expect(isAircraftTypeQuery('123')).toBe(false)
      expect(isAircraftTypeQuery('737')).toBe(false)
    })

    // Note: Patterns like UA123 technically match aircraft type format
    // The actual search logic uses context and priority to disambiguate
  })
})

describe('calculateDistance', () => {
  it('calculates distance between JFK and LAX correctly', () => {
    // JFK: 40.6413, -73.7781
    // LAX: 33.9425, -118.4081
    const distance = calculateDistance(40.6413, -73.7781, 33.9425, -118.4081)
    // Actual distance is ~3983 km
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4100)
  })

  it('calculates distance between London and Paris correctly', () => {
    // London Heathrow: 51.4700, -0.4543
    // Paris CDG: 49.0097, 2.5479
    const distance = calculateDistance(51.4700, -0.4543, 49.0097, 2.5479)
    // Actual distance is ~344 km
    expect(distance).toBeGreaterThan(300)
    expect(distance).toBeLessThan(400)
  })

  it('returns 0 for same coordinates', () => {
    const distance = calculateDistance(40.6413, -73.7781, 40.6413, -73.7781)
    expect(distance).toBe(0)
  })

  it('handles antipodal points', () => {
    // Distance should be close to half Earth's circumference (~20,000 km)
    const distance = calculateDistance(0, 0, 0, 180)
    expect(distance).toBeGreaterThan(19000)
    expect(distance).toBeLessThan(21000)
  })
})
