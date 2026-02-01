// IATA to ICAO airline code mapping
export const IATA_TO_ICAO_AIRLINE: Record<string, string> = {
  // North America
  AA: 'AAL', UA: 'UAL', DL: 'DAL', WN: 'SWA', B6: 'JBU',
  AS: 'ASA', NK: 'NKS', F9: 'FFT', HA: 'HAL',
  AC: 'ACA', WS: 'WJA', AM: 'AMX',
  // Europe
  BA: 'BAW', AF: 'AFR', LH: 'DLH', KL: 'KLM',
  U2: 'EZY', FR: 'RYR', VS: 'VIR', SK: 'SAS',
  AY: 'FIN', AZ: 'ITA', IB: 'IBE', TP: 'TAP',
  LX: 'SWR', OS: 'AUA', SN: 'BEL', TK: 'THY',
  LY: 'ELY', W6: 'WZZ', DY: 'NOR', EI: 'EIN',
  // Middle East
  EK: 'UAE', QR: 'QTR', EY: 'ETD', GF: 'GFA',
  SV: 'SVA', FZ: 'FDB',
  // Asia Pacific
  SQ: 'SIA', CX: 'CPA', NH: 'ANA', JL: 'JAL',
  QF: 'QFA', NZ: 'ANZ', MU: 'CES', CA: 'CCA',
  CZ: 'CSN', BR: 'EVA', CI: 'CAL', KE: 'KAL',
  OZ: 'AAR', TG: 'THA', MH: 'MAS', GA: 'GIA',
  VN: 'HVN', AK: 'AXM', PR: 'PAL', JQ: 'JST',
  // Latin America
  AV: 'AVA', LA: 'TAM', G3: 'GLO', AD: 'AZU',
  AR: 'ARG', CM: 'CMP',
  // Cargo
  FX: 'FDX', '5X': 'UPS',
}

// Known ICAO airline codes
export const ICAO_AIRLINES: Set<string> = new Set([
  'AAL', 'UAL', 'DAL', 'SWA', 'JBU', 'ASA', 'NKS', 'FFT', 'HAL',
  'ACA', 'WJA', 'BAW', 'AFR', 'DLH', 'KLM', 'EZY', 'RYR', 'VIR',
  'SAS', 'FIN', 'ITA', 'IBE', 'TAP', 'SWR', 'AUA', 'BEL', 'THY',
  'ELY', 'WZZ', 'NOR', 'EIN', 'UAE', 'QTR', 'ETD', 'GFA', 'SVA',
  'FDB', 'SIA', 'CPA', 'ANA', 'JAL', 'QFA', 'ANZ', 'CES', 'CCA',
  'CSN', 'EVA', 'CAL', 'KAL', 'AAR', 'THA', 'MAS', 'GIA', 'HVN',
  'AXM', 'PAL', 'JST', 'AVA', 'TAM', 'GLO', 'AZU', 'ARG', 'CMP',
  'FDX', 'UPS', 'AMX',
])

// Flight number pattern - matches UA123, DL456, BA1234, AAL123, B6200, U21000, 5X100, etc.
// Some IATA codes have numbers (B6, U2, W6, G3, 5X), so we allow alphanumeric 2-char codes
const FLIGHT_NUMBER_PATTERN = /^([A-Z\d][A-Z\d]|[A-Z]{3})[\s-]?(\d{1,4})$/i

/**
 * Parse a flight number and convert to ICAO callsign format
 * e.g., "UA123" -> "UAL123", "DL456" -> "DAL456", "AAL789" -> "AAL789"
 */
export function parseFlightNumber(query: string): string | null {
  const match = query.trim().match(FLIGHT_NUMBER_PATTERN)
  if (!match) return null

  const [, airlineCode, flightNum] = match
  const upperCode = airlineCode.toUpperCase()

  // If it's already 3 letters (ICAO), use as-is if valid
  if (upperCode.length === 3 && ICAO_AIRLINES.has(upperCode)) {
    return `${upperCode}${flightNum}`
  }

  // If it's 2 letters (IATA), convert to ICAO
  if (upperCode.length === 2) {
    const icaoCode = IATA_TO_ICAO_AIRLINE[upperCode]
    if (icaoCode) {
      return `${icaoCode}${flightNum}`
    }
  }

  return null
}

// Geographic search patterns
const GEO_PATTERN = /^(?:flights?\s+)?(?:near|around|close\s+to)\s+(.+)$/i
const NEAR_ME_PATTERN = /^(?:flights?\s+)?near\s+me$/i

export interface GeoSearchQuery {
  type: 'near_me' | 'near_location'
  location?: string
}

/**
 * Parse a geographic search query
 * Returns the type and location if applicable
 */
export function parseGeoQuery(query: string): GeoSearchQuery | null {
  const trimmed = query.trim()

  // Check for "near me"
  if (NEAR_ME_PATTERN.test(trimmed)) {
    return { type: 'near_me' }
  }

  // Check for "near [location]"
  const match = trimmed.match(GEO_PATTERN)
  if (match) {
    return { type: 'near_location', location: match[1].trim() }
  }

  return null
}

// Route search patterns
const ROUTE_PATTERNS = [
  /^([A-Z]{3,4})\s*(?:to|→|->|-)\s*([A-Z]{3,4})$/i,  // JFK to LAX, JFK→LAX
  /^([A-Z]{3,4})\s+([A-Z]{3,4})$/i,  // JFK LAX (space separated)
]

export interface RouteQuery {
  origin: string
  destination: string
}

/**
 * Parse a route query (origin to destination)
 * Returns the airport codes if found
 */
export function parseRouteQuery(query: string): RouteQuery | null {
  const trimmed = query.trim()
  if (trimmed.length < 5) return null

  for (const pattern of ROUTE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        origin: match[1].toUpperCase(),
        destination: match[2].toUpperCase(),
      }
    }
  }

  return null
}

// Aircraft type pattern - matches B737, A320, E190, CRJ7, etc.
// Format: 1-3 letters followed by 1-3 digits, optionally followed by an alphanumeric character
const AIRCRAFT_TYPE_PATTERN = /^[A-Z]{1,3}\d{1,3}[A-Z0-9]?$/i

/**
 * Check if a query looks like an aircraft type code
 */
export function isAircraftTypeQuery(query: string): boolean {
  return AIRCRAFT_TYPE_PATTERN.test(query.trim())
}

// Haversine formula to calculate distance between two coordinates
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
