import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Aircraft } from '../types/aircraft'
import { searchAirports, AIRPORTS, IATA_TO_ICAO, type Airport } from '../data/airports'
import { API_URL } from '../lib/api'
import { validateSearchQuery, sanitizeForUrl } from '../utils/validation'
import { fuzzyScore } from '../utils/fuzzy'

// Route search interface
export interface RouteSearch {
  origin: Airport
  destination: Airport
}

// Comprehensive airline callsign prefixes database
const AIRLINES: Record<string, string> = {
  // North America
  AAL: 'American Airlines', UAL: 'United Airlines', DAL: 'Delta Air Lines',
  SWA: 'Southwest', JBU: 'JetBlue', ASA: 'Alaska Airlines',
  NKS: 'Spirit Airlines', FFT: 'Frontier', HAL: 'Hawaiian Airlines',
  ACA: 'Air Canada', WJA: 'WestJet', TSC: 'Air Transat',
  MEX: 'Aeromexico', VOI: 'Volaris', VIV: 'Viva Aerobus',
  SKW: 'SkyWest', RPA: 'Republic Airways', ENY: 'Envoy Air',
  PDT: 'Piedmont', ASH: 'Mesa Airlines', JIA: 'PSA Airlines',
  CPZ: 'Compass Airlines', EJA: 'NetJets',

  // Europe
  BAW: 'British Airways', AFR: 'Air France', DLH: 'Lufthansa',
  KLM: 'KLM', EZY: 'easyJet', RYR: 'Ryanair', VIR: 'Virgin Atlantic',
  SAS: 'Scandinavian', FIN: 'Finnair', AZA: 'ITA Airways',
  IBE: 'Iberia', VLG: 'Vueling', TAP: 'TAP Portugal',
  SWR: 'Swiss', AUA: 'Austrian', BEL: 'Brussels Airlines',
  EWG: 'Eurowings', WZZ: 'Wizz Air', NOR: 'Norwegian',
  THY: 'Turkish Airlines', ELY: 'El Al', AEE: 'Aegean',
  LOT: 'LOT Polish', CSA: 'Czech Airlines', BTI: 'Air Baltic',
  ICE: 'Icelandair', EIN: 'Aer Lingus',

  // Middle East
  UAE: 'Emirates', QTR: 'Qatar Airways', ETD: 'Etihad',
  GFA: 'Gulf Air', SVA: 'Saudia', MEA: 'Middle East Airlines',
  KAC: 'Kuwait Airways', OMA: 'Oman Air', FDB: 'flydubai',

  // Asia Pacific
  SIA: 'Singapore Airlines', CPA: 'Cathay Pacific', ANA: 'All Nippon',
  JAL: 'Japan Airlines', QFA: 'Qantas', ANZ: 'Air New Zealand',
  CES: 'China Eastern', CCA: 'Air China', CSN: 'China Southern',
  HDA: 'Hong Kong Airlines', EVA: 'EVA Air', CAL: 'China Airlines',
  KAL: 'Korean Air', AAR: 'Asiana', THA: 'Thai Airways',
  MAS: 'Malaysia Airlines', GIA: 'Garuda Indonesia', VNM: 'Vietnam Airlines',
  AIQ: 'AirAsia', SQC: 'Singapore Cargo',
  PAL: 'Philippine Airlines', JST: 'Jetstar', TGW: 'Scoot',

  // Latin America
  AVA: 'Avianca', TAM: 'LATAM', GLO: 'Gol',
  AZU: 'Azul', ARG: 'Aerolineas Argentinas', CMP: 'Copa',
  SKU: 'Sky Airline', LAW: 'LATAM Chile',

  // Africa
  SAA: 'South African', ETH: 'Ethiopian', MSR: 'EgyptAir',
  RAM: 'Royal Air Maroc', KQA: 'Kenya Airways',

  // Cargo
  FDX: 'FedEx Express', UPS: 'UPS Airlines', GTI: 'Atlas Air',
  CLX: 'Cargolux', ABW: 'AirBridgeCargo', MGL: 'MIAT Mongolian',
}

// Create reverse lookup: airline name -> code (for name-based search)
// Includes partial names and common variations
const AIRLINE_NAME_TO_CODE: Map<string, string> = new Map()
Object.entries(AIRLINES).forEach(([code, name]) => {
  // Add full name (lowercase)
  AIRLINE_NAME_TO_CODE.set(name.toLowerCase(), code)
  // Add name without "Airlines", "Airways", "Air" suffix
  const simpleName = name.toLowerCase()
    .replace(/\s*(airlines?|airways?)\s*$/i, '')
    .trim()
  if (simpleName !== name.toLowerCase()) {
    AIRLINE_NAME_TO_CODE.set(simpleName, code)
  }
  // Add first word for multi-word names (e.g., "American" for "American Airlines")
  const firstWord = name.split(' ')[0].toLowerCase()
  if (firstWord.length > 3 && !AIRLINE_NAME_TO_CODE.has(firstWord)) {
    AIRLINE_NAME_TO_CODE.set(firstWord, code)
  }
})

// Find airlines matching a query (for suggestions) with fuzzy search
function findMatchingAirlines(query: string): Array<{ code: string; name: string }> {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()
  const matches: Array<{ code: string; name: string; score: number }> = []

  // Check exact code match first
  const upperQ = query.toUpperCase()
  if (AIRLINES[upperQ]) {
    return [{ code: upperQ, name: AIRLINES[upperQ] }]
  }

  // Fuzzy match against airline names and codes
  Object.entries(AIRLINES).forEach(([code, name]) => {
    const nameLower = name.toLowerCase()
    const codeLower = code.toLowerCase()

    // Calculate fuzzy scores
    const nameScore = fuzzyScore(q, nameLower)
    const codeScore = fuzzyScore(q, codeLower)

    // Use the better score
    const bestScore = Math.max(nameScore, codeScore)

    // Include if score is above threshold (0.4 allows for typos)
    if (bestScore >= 0.4) {
      matches.push({ code, name, score: bestScore })
    }
  })

  // Sort by score descending and limit to 5
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ code, name }) => ({ code, name }))
}

// Get airline code from callsign
function getAirlineCode(callsign: string | null): string | null {
  if (!callsign || callsign.length < 3) return null
  return callsign.substring(0, 3).toUpperCase()
}

// Get airline name from callsign
function getAirline(callsign: string | null): string | null {
  const code = getAirlineCode(callsign)
  return code ? AIRLINES[code] || null : null
}

type FilterType = 'all' | 'airborne' | 'ground'
type AltitudeFilter = 'all' | 'low' | 'medium' | 'high'
type SpeedFilter = 'all' | 'slow' | 'medium' | 'fast'

// Altitude ranges in meters (OpenSky returns altitude in meters)
// Low: 0 - 10,000 ft (0 - 3,048 m)
// Medium: 10,000 - 25,000 ft (3,048 - 7,620 m)
// High: 25,000+ ft (7,620+ m)
const ALTITUDE_RANGES: Record<Exclude<AltitudeFilter, 'all'>, { min: number; max: number; label: string; ftLabel: string }> = {
  low: { min: 0, max: 3048, label: 'Low', ftLabel: '< 10K ft' },
  medium: { min: 3048, max: 7620, label: 'Medium', ftLabel: '10K-25K ft' },
  high: { min: 7620, max: Infinity, label: 'High', ftLabel: '> 25K ft' },
}

// Speed ranges in m/s (OpenSky returns velocity in m/s)
// Slow: < 200 kts (< 103 m/s) - small aircraft, climbing/descending
// Medium: 200-400 kts (103-206 m/s) - regional jets, turboprops
// Fast: > 400 kts (> 206 m/s) - jets at cruise
const SPEED_RANGES: Record<Exclude<SpeedFilter, 'all'>, { min: number; max: number; label: string; ktsLabel: string }> = {
  slow: { min: 0, max: 103, label: 'Slow', ktsLabel: '< 200 kts' },
  medium: { min: 103, max: 206, label: 'Medium', ktsLabel: '200-400 kts' },
  fast: { min: 206, max: Infinity, label: 'Fast', ktsLabel: '> 400 kts' },
}

type CategoryFilter = 'all' | 'commercial' | 'cargo' | 'private' | 'military'

// Known cargo airline prefixes
const CARGO_AIRLINES = new Set(['FDX', 'UPS', 'GTI', 'CLX', 'ABW', 'CAO', 'CKS', 'MPH', 'KAL', 'NCA', 'BOX', 'GEC', 'POE', 'DHK'])

// Known military callsign patterns
const MILITARY_PATTERNS = [
  /^RCH/, /^REACH/, /^DUKE/, /^EVAC/, /^NAVY/, /^ARMY/, /^USAF/,
  /^RAF/, /^ASCOT/, /^NATO/, /^CANFORCE/, /^AUSSIE/, /^KIWI/,
  /^\d{5}$/, // 5-digit callsigns often military
]

// Get aircraft category from callsign
function getAircraftCategory(callsign: string | null): CategoryFilter {
  if (!callsign) return 'private'
  const cs = callsign.toUpperCase().trim()

  // Check military patterns
  if (MILITARY_PATTERNS.some(p => p.test(cs))) return 'military'

  // Check cargo airlines
  const prefix = cs.substring(0, 3)
  if (CARGO_AIRLINES.has(prefix)) return 'cargo'

  // Check if it's a known commercial airline
  if (AIRLINES[prefix]) return 'commercial'

  // N-numbers and other registrations are typically private
  if (/^N\d/.test(cs) || /^[A-Z]-[A-Z]{4}/.test(cs) || /^[A-Z]{2}-[A-Z]{3}/.test(cs)) {
    return 'private'
  }

  // Default to commercial if has 3-letter prefix followed by numbers
  if (/^[A-Z]{3}\d/.test(cs)) return 'commercial'

  return 'private'
}

const CATEGORY_INFO: Record<Exclude<CategoryFilter, 'all'>, { label: string; icon: string; color: string }> = {
  commercial: { label: 'Commercial', icon: '✈', color: '#0ea5e9' },
  cargo: { label: 'Cargo', icon: '📦', color: '#f59e0b' },
  private: { label: 'Private', icon: '🛩', color: '#22c55e' },
  military: { label: 'Military', icon: '🎖', color: '#ef4444' },
}

// Common aircraft types database for search suggestions
// ICAO type code -> { name, manufacturer, category }
const AIRCRAFT_TYPES: Record<string, { name: string; manufacturer: string; category: 'narrowbody' | 'widebody' | 'regional' | 'cargo' | 'private' | 'military' }> = {
  // Boeing Narrowbody
  B737: { name: 'Boeing 737', manufacturer: 'Boeing', category: 'narrowbody' },
  B738: { name: 'Boeing 737-800', manufacturer: 'Boeing', category: 'narrowbody' },
  B739: { name: 'Boeing 737-900', manufacturer: 'Boeing', category: 'narrowbody' },
  B38M: { name: 'Boeing 737 MAX 8', manufacturer: 'Boeing', category: 'narrowbody' },
  B39M: { name: 'Boeing 737 MAX 9', manufacturer: 'Boeing', category: 'narrowbody' },
  // Boeing Widebody
  B744: { name: 'Boeing 747-400', manufacturer: 'Boeing', category: 'widebody' },
  B748: { name: 'Boeing 747-8', manufacturer: 'Boeing', category: 'widebody' },
  B763: { name: 'Boeing 767-300', manufacturer: 'Boeing', category: 'widebody' },
  B772: { name: 'Boeing 777-200', manufacturer: 'Boeing', category: 'widebody' },
  B77W: { name: 'Boeing 777-300ER', manufacturer: 'Boeing', category: 'widebody' },
  B788: { name: 'Boeing 787-8', manufacturer: 'Boeing', category: 'widebody' },
  B789: { name: 'Boeing 787-9', manufacturer: 'Boeing', category: 'widebody' },
  B78X: { name: 'Boeing 787-10', manufacturer: 'Boeing', category: 'widebody' },
  // Airbus Narrowbody
  A319: { name: 'Airbus A319', manufacturer: 'Airbus', category: 'narrowbody' },
  A320: { name: 'Airbus A320', manufacturer: 'Airbus', category: 'narrowbody' },
  A321: { name: 'Airbus A321', manufacturer: 'Airbus', category: 'narrowbody' },
  A20N: { name: 'Airbus A320neo', manufacturer: 'Airbus', category: 'narrowbody' },
  A21N: { name: 'Airbus A321neo', manufacturer: 'Airbus', category: 'narrowbody' },
  // Airbus Widebody
  A332: { name: 'Airbus A330-200', manufacturer: 'Airbus', category: 'widebody' },
  A333: { name: 'Airbus A330-300', manufacturer: 'Airbus', category: 'widebody' },
  A339: { name: 'Airbus A330-900neo', manufacturer: 'Airbus', category: 'widebody' },
  A346: { name: 'Airbus A340-600', manufacturer: 'Airbus', category: 'widebody' },
  A359: { name: 'Airbus A350-900', manufacturer: 'Airbus', category: 'widebody' },
  A35K: { name: 'Airbus A350-1000', manufacturer: 'Airbus', category: 'widebody' },
  A380: { name: 'Airbus A380', manufacturer: 'Airbus', category: 'widebody' },
  A388: { name: 'Airbus A380-800', manufacturer: 'Airbus', category: 'widebody' },
  // Regional Jets
  E170: { name: 'Embraer E170', manufacturer: 'Embraer', category: 'regional' },
  E175: { name: 'Embraer E175', manufacturer: 'Embraer', category: 'regional' },
  E190: { name: 'Embraer E190', manufacturer: 'Embraer', category: 'regional' },
  E195: { name: 'Embraer E195', manufacturer: 'Embraer', category: 'regional' },
  E75L: { name: 'Embraer E175 Long', manufacturer: 'Embraer', category: 'regional' },
  CRJ2: { name: 'Bombardier CRJ-200', manufacturer: 'Bombardier', category: 'regional' },
  CRJ7: { name: 'Bombardier CRJ-700', manufacturer: 'Bombardier', category: 'regional' },
  CRJ9: { name: 'Bombardier CRJ-900', manufacturer: 'Bombardier', category: 'regional' },
  DH8D: { name: 'Dash 8 Q400', manufacturer: 'De Havilland', category: 'regional' },
  AT76: { name: 'ATR 72-600', manufacturer: 'ATR', category: 'regional' },
  // Business/Private Jets
  GLF5: { name: 'Gulfstream G550', manufacturer: 'Gulfstream', category: 'private' },
  GLF6: { name: 'Gulfstream G650', manufacturer: 'Gulfstream', category: 'private' },
  GL7T: { name: 'Gulfstream G700', manufacturer: 'Gulfstream', category: 'private' },
  C56X: { name: 'Cessna Citation Excel', manufacturer: 'Cessna', category: 'private' },
  C680: { name: 'Cessna Citation Sovereign', manufacturer: 'Cessna', category: 'private' },
  C750: { name: 'Cessna Citation X', manufacturer: 'Cessna', category: 'private' },
  PC12: { name: 'Pilatus PC-12', manufacturer: 'Pilatus', category: 'private' },
  PC24: { name: 'Pilatus PC-24', manufacturer: 'Pilatus', category: 'private' },
  CL35: { name: 'Bombardier Challenger 350', manufacturer: 'Bombardier', category: 'private' },
  GL5T: { name: 'Bombardier Global 5000', manufacturer: 'Bombardier', category: 'private' },
  GLEX: { name: 'Bombardier Global Express', manufacturer: 'Bombardier', category: 'private' },
}

// Aircraft type pattern - matches B737, A320, E175, etc.
const AIRCRAFT_TYPE_PATTERN = /^([A-Z]{1,2}\d{2,3}[A-Z]?|[A-Z]{2}\d[A-Z])$/i

// Find matching aircraft types for suggestions
function findMatchingAircraftTypes(query: string): Array<{ code: string; info: typeof AIRCRAFT_TYPES[string] }> {
  if (!query || query.length < 2) return []
  const q = query.toUpperCase().trim()
  const matches: Array<{ code: string; info: typeof AIRCRAFT_TYPES[string]; score: number }> = []

  // Check exact type code match first
  if (AIRCRAFT_TYPES[q]) {
    return [{ code: q, info: AIRCRAFT_TYPES[q] }]
  }

  // Check for partial matches in code or name
  Object.entries(AIRCRAFT_TYPES).forEach(([code, info]) => {
    const codeLower = code.toLowerCase()
    const nameLower = info.name.toLowerCase()
    const qLower = query.toLowerCase()

    let score = 0
    if (code.startsWith(q)) score = 10
    else if (codeLower.includes(qLower)) score = 5
    else if (nameLower.includes(qLower)) score = 3
    else if (info.manufacturer.toLowerCase().includes(qLower)) score = 2

    if (score > 0) {
      matches.push({ code, info, score })
    }
  })

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ code, info }) => ({ code, info }))
}

// Recent searches storage
const RECENT_SEARCHES_KEY = 'aerolens_recent_searches'
const MAX_RECENT_SEARCHES = 5

// Route pattern detection
// Matches: "JFK to LAX", "JFK-LAX", "JFK > LAX", "KJFK - KLAX", "New York to Los Angeles"
const ROUTE_PATTERNS = [
  /^([A-Z]{3,4})\s*(?:to|->|>|-|–|—)\s*([A-Z]{3,4})$/i,  // Code to code
  /^([A-Za-z\s]+)\s+to\s+([A-Za-z\s]+)$/i,                // City to city
]

// Flight number patterns - matches UA123, DL456, BA1234, etc.
// IATA codes are 2 letters, ICAO codes are 3 letters
const FLIGHT_NUMBER_PATTERN = /^([A-Z]{2,3})[\s-]?(\d{1,4})$/i

// IATA to ICAO airline code mapping (common airlines)
const IATA_TO_ICAO_AIRLINE: Record<string, string> = {
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

// Parse flight number and convert to callsign format
// e.g., "UA123" -> "UAL123", "DL456" -> "DAL456"
function parseFlightNumber(query: string): string | null {
  const match = query.trim().match(FLIGHT_NUMBER_PATTERN)
  if (!match) return null

  const [, airlineCode, flightNum] = match
  const upperCode = airlineCode.toUpperCase()

  // If it's already 3 letters (ICAO), use as-is
  if (upperCode.length === 3 && AIRLINES[upperCode]) {
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
// Matches: "near me", "flights near LAX", "near JFK", "around KJFK"
const GEO_PATTERN = /^(?:flights?\s+)?(?:near|around|close\s+to)\s+(.+)$/i
const NEAR_ME_PATTERN = /^(?:flights?\s+)?near\s+me$/i

export interface GeoSearch {
  lat: number
  lon: number
  label: string
  radius: number // in km
}

// Parse geographic search query
function parseGeoQuery(query: string): GeoSearch | null {
  const trimmed = query.trim()

  // Check for "near me"
  if (NEAR_ME_PATTERN.test(trimmed)) {
    return null // Will be resolved with geolocation in component
  }

  // Check for "near [airport/city]"
  const match = trimmed.match(GEO_PATTERN)
  if (match) {
    const location = match[1].trim()
    const airport = findAirportByCodeOrCity(location)
    if (airport) {
      return {
        lat: airport.lat,
        lon: airport.lon,
        label: `Near ${airport.city} (${airport.iata})`,
        radius: 200, // 200km default radius
      }
    }
  }

  return null
}

// Parse a route query and return both airports if found
function parseRouteQuery(query: string): RouteSearch | null {
  const trimmed = query.trim()
  if (trimmed.length < 5) return null // Minimum "A to B"

  for (const pattern of ROUTE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      const [, origin, destination] = match
      const originAirport = findAirportByCodeOrCity(origin.trim())
      const destAirport = findAirportByCodeOrCity(destination.trim())

      if (originAirport && destAirport && originAirport.icao !== destAirport.icao) {
        return { origin: originAirport, destination: destAirport }
      }
    }
  }

  return null
}

// Find airport by ICAO, IATA code, or city name
function findAirportByCodeOrCity(input: string): Airport | null {
  const upper = input.toUpperCase()
  const lower = input.toLowerCase()

  // Try exact ICAO match
  if (AIRPORTS[upper]) {
    return AIRPORTS[upper]
  }

  // Try IATA match
  const icaoFromIata = IATA_TO_ICAO[upper]
  if (icaoFromIata && AIRPORTS[icaoFromIata]) {
    return AIRPORTS[icaoFromIata]
  }

  // Try city match (exact or starts with)
  for (const airport of Object.values(AIRPORTS)) {
    if (airport.city.toLowerCase() === lower ||
        airport.city.toLowerCase().startsWith(lower) ||
        airport.name.toLowerCase().includes(lower)) {
      return airport
    }
  }

  return null
}

// Popular/suggested flight searches
const SUGGESTED_SEARCHES = [
  { query: 'AAL', label: 'American Airlines', icon: '🇺🇸' },
  { query: 'UAL', label: 'United Airlines', icon: '🇺🇸' },
  { query: 'DAL', label: 'Delta Air Lines', icon: '🇺🇸' },
  { query: 'BAW', label: 'British Airways', icon: '🇬🇧' },
  { query: 'DLH', label: 'Lufthansa', icon: '🇩🇪' },
  { query: 'UAE', label: 'Emirates', icon: '🇦🇪' },
  { query: 'FDX', label: 'FedEx Cargo', icon: '📦' },
  { query: 'AFR', label: 'Air France', icon: '🇫🇷' },
]

interface RecentSearch {
  callsign: string
  icao24: string
  airline: string | null
  timestamp: number
}

function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(aircraft: Aircraft): void {
  try {
    const recent = getRecentSearches()
    const newSearch: RecentSearch = {
      callsign: aircraft.callsign || '',
      icao24: aircraft.icao24,
      airline: getAirline(aircraft.callsign),
      timestamp: Date.now(),
    }
    // Remove duplicate if exists
    const filtered = recent.filter(r => r.icao24 !== newSearch.icao24)
    // Add to front and limit
    const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_SEARCHES_KEY)
}

interface Props {
  onSelect: (aircraft: Aircraft) => void
  onAirportSelect?: (airport: Airport) => void
  onRouteSelect?: (route: RouteSearch) => void
  onGeoSelect?: (geo: GeoSearch) => void
}

export function SearchBox({ onSelect, onAirportSelect, onRouteSelect, onGeoSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Aircraft[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [airlineFilter, setAirlineFilter] = useState<string | null>(null)
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false)
  const [altitudeFilter, setAltitudeFilter] = useState<AltitudeFilter>('all')
  const [showAltitudeDropdown, setShowAltitudeDropdown] = useState(false)
  const [speedFilter, setSpeedFilter] = useState<SpeedFilter>('all')
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [aircraftTypeFilter, setAircraftTypeFilter] = useState<string | null>(null)
  const [aircraftTypeSuggestions, setAircraftTypeSuggestions] = useState<Array<{ code: string; info: typeof AIRCRAFT_TYPES[string] }>>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [airlineSuggestions, setAirlineSuggestions] = useState<Array<{ code: string; name: string }>>([])
  const [airportSuggestions, setAirportSuggestions] = useState<Airport[]>([])
  const [routeSuggestion, setRouteSuggestion] = useState<RouteSearch | null>(null)
  const [geoSuggestion, setGeoSuggestion] = useState<GeoSearch | null>(null)
  const [isNearMeSearch, setIsNearMeSearch] = useState(false)
  const [locatingUser, setLocatingUser] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Global keyboard shortcut: "/" or Ctrl+K to focus search
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // "/" to focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // Ctrl+K or Cmd+K to focus search
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Get unique airlines from results
  const airlinesInResults = useMemo(() => {
    const airlines = new Map<string, { code: string; name: string; count: number }>()
    results.forEach(a => {
      const code = getAirlineCode(a.callsign)
      if (code && AIRLINES[code]) {
        const existing = airlines.get(code)
        if (existing) {
          existing.count++
        } else {
          airlines.set(code, { code, name: AIRLINES[code], count: 1 })
        }
      }
    })
    return Array.from(airlines.values()).sort((a, b) => b.count - a.count)
  }, [results])

  // Filter results based on selected filters
  const filteredResults = useMemo(() => {
    return results.filter(a => {
      // Status filter
      if (filter === 'airborne' && a.onGround) return false
      if (filter === 'ground' && !a.onGround) return false
      // Airline filter
      if (airlineFilter && getAirlineCode(a.callsign) !== airlineFilter) return false
      // Altitude filter (only applies to airborne aircraft)
      if (altitudeFilter !== 'all' && !a.onGround && a.altitude !== null) {
        const range = ALTITUDE_RANGES[altitudeFilter]
        if (a.altitude < range.min || a.altitude >= range.max) return false
      }
      // Speed filter (only applies to airborne aircraft)
      if (speedFilter !== 'all' && !a.onGround && a.velocity !== null) {
        const range = SPEED_RANGES[speedFilter]
        if (a.velocity < range.min || a.velocity >= range.max) return false
      }
      // Category filter
      if (categoryFilter !== 'all' && getAircraftCategory(a.callsign) !== categoryFilter) return false
      // Aircraft type filter
      if (aircraftTypeFilter && a.type) {
        if (!a.type.toUpperCase().startsWith(aircraftTypeFilter.toUpperCase())) return false
      } else if (aircraftTypeFilter && !a.type) {
        return false // No type data, filter out if type filter is active
      }
      return true
    })
  }, [results, filter, airlineFilter, altitudeFilter, speedFilter, categoryFilter, aircraftTypeFilter])

  // Get altitude distribution from results (for showing counts)
  const altitudeDistribution = useMemo(() => {
    const dist = { low: 0, medium: 0, high: 0 }
    results.forEach(a => {
      if (!a.onGround && a.altitude !== null) {
        if (a.altitude < 3048) dist.low++
        else if (a.altitude < 7620) dist.medium++
        else dist.high++
      }
    })
    return dist
  }, [results])

  // Get speed distribution from results (for showing counts)
  const speedDistribution = useMemo(() => {
    const dist = { slow: 0, medium: 0, fast: 0 }
    results.forEach(a => {
      if (!a.onGround && a.velocity !== null) {
        if (a.velocity < 103) dist.slow++
        else if (a.velocity < 206) dist.medium++
        else dist.fast++
      }
    })
    return dist
  }, [results])

  // Get category distribution from results (for showing counts)
  const categoryDistribution = useMemo(() => {
    const dist = { commercial: 0, cargo: 0, private: 0, military: 0 }
    results.forEach(a => {
      const cat = getAircraftCategory(a.callsign)
      if (cat !== 'all') dist[cat]++
    })
    return dist
  }, [results])

  // Detect airline names and show suggestions
  useEffect(() => {
    if (query.length < 2) {
      setAirlineSuggestions([])
      return
    }

    // Check if query looks like an airline name (not a callsign/code pattern)
    const isLikelyName = !/^[A-Z]{2,3}\d/.test(query.toUpperCase()) &&
                         !/^[A-Z0-9]{6}$/.test(query.toUpperCase())

    if (isLikelyName) {
      const matches = findMatchingAirlines(query)
      // Only show suggestions if query doesn't exactly match a known code
      if (!AIRLINES[query.toUpperCase()]) {
        setAirlineSuggestions(matches)
      } else {
        setAirlineSuggestions([])
      }
    } else {
      setAirlineSuggestions([])
    }
  }, [query])

  // Detect aircraft type queries and show suggestions
  useEffect(() => {
    if (query.length < 2) {
      setAircraftTypeSuggestions([])
      return
    }

    // Check if query looks like an aircraft type (B737, A320, etc.)
    const upperQuery = query.toUpperCase().trim()
    const looksLikeType = AIRCRAFT_TYPE_PATTERN.test(upperQuery) ||
                          /^(BOEING|AIRBUS|EMBRAER|BOMBARDIER)/i.test(query)

    if (looksLikeType) {
      const matches = findMatchingAircraftTypes(query)
      setAircraftTypeSuggestions(matches)
    } else {
      setAircraftTypeSuggestions([])
    }
  }, [query])

  // Search for airports when query changes
  useEffect(() => {
    if (query.length < 2 || !onAirportSelect) {
      setAirportSuggestions([])
      return
    }
    const airports = searchAirports(query, 3)
    setAirportSuggestions(airports)
  }, [query, onAirportSelect])

  // Detect route queries (e.g., "JFK to LAX")
  useEffect(() => {
    if (query.length < 5 || !onRouteSelect) {
      setRouteSuggestion(null)
      return
    }
    const route = parseRouteQuery(query)
    setRouteSuggestion(route)
  }, [query, onRouteSelect])

  // Detect geographic search queries
  useEffect(() => {
    const trimmed = query.trim().toLowerCase()

    // Check for "near me"
    if (NEAR_ME_PATTERN.test(trimmed)) {
      setIsNearMeSearch(true)
      setGeoSuggestion(null)
      return
    }

    setIsNearMeSearch(false)

    // Check for "near [location]"
    const geo = parseGeoQuery(query)
    setGeoSuggestion(geo)
  }, [query])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    // Skip API search if this is a geo query
    if (isNearMeSearch || geoSuggestion) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        // Check if we should search by airline code instead
        let searchQuery = query

        // Try flight number parsing first (UA123 -> UAL123)
        const flightCallsign = parseFlightNumber(query)
        if (flightCallsign) {
          searchQuery = flightCallsign
        } else {
          // If query matches an airline name exactly, use its code
          for (const [name, code] of AIRLINE_NAME_TO_CODE.entries()) {
            if (name === query.toLowerCase()) {
              searchQuery = code
              break
            }
          }
        }

        // Validate the search query before sending
        const validation = validateSearchQuery(searchQuery)
        if (!validation.valid) {
          setResults([])
          setOpen(true)
          return
        }

        const res = await fetch(`${API_URL}/api/aircraft/search?q=${sanitizeForUrl(validation.value || searchQuery)}`)
        if (!res.ok) return
        const data = await res.json()
        setResults(data.results || [])
        setOpen(true)
        setSelectedIndex(-1)
      } catch {
        setResults([])
        setOpen(true)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, isNearMeSearch, geoSuggestion])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [filter, airlineFilter, altitudeFilter, speedFilter, categoryFilter])

  // Reset filters when query changes
  useEffect(() => {
    setAirlineFilter(null)
    setAltitudeFilter('all')
    setSpeedFilter('all')
    setCategoryFilter('all')
    setAircraftTypeFilter(null)
  }, [query])

  const handleSelect = useCallback((aircraft: Aircraft) => {
    saveRecentSearch(aircraft)
    setRecentSearches(getRecentSearches())
    onSelect(aircraft)
    setQuery('')
    setResults([])
    setOpen(false)
    setSelectedIndex(-1)
  }, [onSelect])

  const handleAirportSelect = useCallback((airport: Airport) => {
    if (onAirportSelect) {
      onAirportSelect(airport)
    }
    setQuery('')
    setResults([])
    setAirportSuggestions([])
    setOpen(false)
  }, [onAirportSelect])

  const handleRouteSelect = useCallback((route: RouteSearch) => {
    if (onRouteSelect) {
      onRouteSelect(route)
    }
    setQuery('')
    setResults([])
    setRouteSuggestion(null)
    setAirportSuggestions([])
    setOpen(false)
  }, [onRouteSelect])

  const handleGeoSearch = useCallback(() => {
    // For "near me" searches, get user's location
    if (isNearMeSearch) {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser')
        return
      }

      setLocatingUser(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocatingUser(false)
          const geo: GeoSearch = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            label: 'Near your location',
            radius: 200, // 200km default radius
          }
          if (onGeoSelect) {
            onGeoSelect(geo)
          }
          setQuery('')
          setResults([])
          setGeoSuggestion(null)
          setIsNearMeSearch(false)
          setOpen(false)
        },
        (error) => {
          setLocatingUser(false)
          let message = 'Unable to get your location'
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission denied. Please enable location access.'
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location unavailable. Please try again.'
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out. Please try again.'
          }
          alert(message)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      )
    } else if (geoSuggestion) {
      // For "near [location]" searches, use the pre-computed coordinates
      if (onGeoSelect) {
        onGeoSelect(geoSuggestion)
      }
      setQuery('')
      setResults([])
      setGeoSuggestion(null)
      setIsNearMeSearch(false)
      setOpen(false)
    }
  }, [isNearMeSearch, geoSuggestion, onGeoSelect])

  const handleAircraftTypeSelect = useCallback((typeCode: string) => {
    // Set the aircraft type filter and search for aircraft of that type
    setAircraftTypeFilter(typeCode)
    setQuery(typeCode) // Set query to search for this type
    setAircraftTypeSuggestions([])
    // The search effect will be triggered and search for this type
  }, [])

  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || filteredResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredResults.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredResults.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
          handleSelect(filteredResults[selectedIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        setSelectedIndex(-1)
        break
    }
  }, [open, filteredResults, selectedIndex, handleSelect])

  return (
    <div ref={ref} className="mobile-search" style={{
      position: 'absolute',
      top: 80,
      left: 20,
      right: 'auto',
      zIndex: 1000,
      width: 'min(360px, calc(100vw - 40px))',
      maxWidth: 'calc(100vw - 40px)',
    }}>
      {/* Search input */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={focused ? '#0ea5e9' : '#64748b'}
          strokeWidth="2"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 16,
            pointerEvents: 'none',
            transition: 'stroke 150ms ease',
          }}
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by callsign, ICAO24, or airline name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search for aircraft by callsign, ICAO24, or airline name"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={open}
          role="combobox"
          onFocus={() => {
            setFocused(true)
            if (query.length >= 2) setOpen(true)
            // Refresh recent searches when focusing
            if (!query) setRecentSearches(getRecentSearches())
          }}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '14px 16px 14px 48px',
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(12px)',
            border: focused ? '1px solid #0ea5e9' : '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 12,
            fontSize: 14,
            color: '#f8fafc',
            boxShadow: focused
              ? '0 0 20px rgba(14, 165, 233, 0.2)'
              : '0 4px 12px rgba(0, 0, 0, 0.3)',
            outline: 'none',
            transition: 'all 150ms ease',
          }}
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: 12,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(148, 163, 184, 0.2)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 14,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(148, 163, 184, 0.3)'
              e.currentTarget.style.color = '#f8fafc'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(148, 163, 184, 0.2)'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            ×
          </button>
        ) : !focused && (
          <kbd
            style={{
              position: 'absolute',
              right: 12,
              padding: '4px 8px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          >
            /
          </kbd>
        )}
      </div>

      {/* Recent searches - shown when focused but no query */}
      {focused && !query && recentSearches.length > 0 && (
        <div
          className="fade-in"
          onMouseDown={e => e.preventDefault()} // Prevent blur when clicking inside dropdown
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              Recent Searches
            </span>
            <button
              onClick={handleClearRecent}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              Clear all
            </button>
          </div>
          {recentSearches.map((search, i) => (
            <button
              key={search.icao24}
              onClick={async () => {
                // Try to find and select the aircraft directly
                try {
                  const searchTerm = search.callsign || search.icao24
                  const res = await fetch(`${API_URL}/api/aircraft/search?q=${encodeURIComponent(searchTerm)}`)
                  if (res.ok) {
                    const data = await res.json()
                    const results = data.results || []
                    // Try to find exact match by ICAO24
                    const match = results.find((a: Aircraft) => a.icao24 === search.icao24)
                    if (match) {
                      handleSelect(match)
                      return
                    }
                    // If no exact match, select first result if any
                    if (results.length > 0) {
                      handleSelect(results[0])
                      return
                    }
                  }
                } catch {
                  // Fall through to query set
                }
                // Aircraft not currently tracked - set query and show in results
                setQuery(search.callsign || search.icao24)
                setOpen(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: i < recentSearches.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 28,
                height: 28,
                background: 'rgba(14, 165, 233, 0.1)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                  {search.callsign || search.icao24}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {search.airline || `ICAO: ${search.icao24}`}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0 }} aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Suggested searches - shown when focused but no query and no recent searches */}
      {focused && !query && recentSearches.length === 0 && (
        <div
          className="fade-in"
          onMouseDown={e => e.preventDefault()} // Prevent blur when clicking inside dropdown
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            Popular Airlines
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 4,
            padding: 6,
          }}>
            {SUGGESTED_SEARCHES.map(suggestion => (
              <button
                key={suggestion.query}
                onClick={() => setQuery(suggestion.query)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 16 }}>{suggestion.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 12 }}>
                    {suggestion.query}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {suggestion.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested searches below recent searches */}
      {focused && !query && recentSearches.length > 0 && (
        <div
          className="fade-in"
          onMouseDown={e => e.preventDefault()} // Prevent blur when clicking inside dropdown
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            Try searching
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: 10,
          }}>
            {SUGGESTED_SEARCHES.slice(0, 6).map(suggestion => (
              <button
                key={suggestion.query}
                onClick={() => setQuery(suggestion.query)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: 20,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  fontSize: 11,
                  color: '#94a3b8',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.3)'
                  e.currentTarget.style.color = '#0ea5e9'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                <span style={{ fontSize: 12 }}>{suggestion.icon}</span>
                {suggestion.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Airline name suggestions - shown when typing an airline name */}
      {airlineSuggestions.length > 0 && results.length === 0 && (
        <div
          className="fade-in"
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#a78bfa',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(139, 92, 246, 0.05)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
            Did you mean this airline?
          </div>
          {airlineSuggestions.map((airline, i) => (
            <button
              key={airline.code}
              onClick={() => {
                setQuery(airline.code)
                setAirlineSuggestions([])
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: i < airlineSuggestions.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 36,
                height: 36,
                background: 'rgba(139, 92, 246, 0.15)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontWeight: 700,
                  color: '#a78bfa',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}>
                  {airline.code}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                  {airline.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Search all {airline.code} flights
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" style={{ flexShrink: 0 }} aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Airport suggestions - shown when typing an airport code or name */}
      {airportSuggestions.length > 0 && !routeSuggestion && (
        <div
          className="fade-in"
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(34, 197, 94, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#22c55e',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34, 197, 94, 0.05)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
            Go to Airport
          </div>
          {airportSuggestions.map((airport, i) => (
            <button
              key={airport.icao}
              onClick={() => handleAirportSelect(airport)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: i < airportSuggestions.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 36,
                height: 36,
                background: 'rgba(34, 197, 94, 0.15)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontWeight: 700,
                  color: '#22c55e',
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}>
                  {airport.iata}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                  {airport.city}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {airport.name}
                </div>
              </div>
              <div style={{
                padding: '4px 8px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 6,
                fontSize: 10,
                color: '#22c55e',
                fontWeight: 500,
              }}>
                {airport.country}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Route suggestion - shown when typing a route pattern like "JFK to LAX" */}
      {routeSuggestion && onRouteSelect && (
        <div
          className="fade-in"
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(249, 115, 22, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#f97316',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(249, 115, 22, 0.05)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 12h4l3-9 4 18 3-9h4"/>
            </svg>
            View Route
          </div>
          <button
            onClick={() => handleRouteSelect(routeSuggestion)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Origin */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              <div style={{
                width: 40,
                height: 40,
                background: 'rgba(249, 115, 22, 0.15)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontWeight: 700,
                  color: '#f97316',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}>
                  {routeSuggestion.origin.iata}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {routeSuggestion.origin.city}
              </span>
            </div>

            {/* Route line */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 8px',
            }}>
              <div style={{
                flex: 1,
                height: 2,
                background: 'linear-gradient(90deg, #f97316 0%, rgba(249, 115, 22, 0.3) 50%, #f97316 100%)',
                borderRadius: 1,
              }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
              </svg>
              <div style={{
                flex: 1,
                height: 2,
                background: 'linear-gradient(90deg, #f97316 0%, rgba(249, 115, 22, 0.3) 50%, #f97316 100%)',
                borderRadius: 1,
              }} />
            </div>

            {/* Destination */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              <div style={{
                width: 40,
                height: 40,
                background: 'rgba(249, 115, 22, 0.15)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontWeight: 700,
                  color: '#f97316',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}>
                  {routeSuggestion.destination.iata}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {routeSuggestion.destination.city}
              </span>
            </div>
          </button>
          <div style={{
            padding: '8px 16px 12px',
            fontSize: 11,
            color: '#64748b',
            textAlign: 'center',
            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          }}>
            View flights along this route
          </div>
        </div>
      )}

      {/* Geographic search - "near me" or "near [location]" */}
      {(isNearMeSearch || geoSuggestion) && (
        <div
          className="fade-in"
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(34, 197, 94, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#22c55e',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34, 197, 94, 0.05)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
            </svg>
            Geographic Search
          </div>
          <button
            onClick={() => handleGeoSearch()}
            disabled={locatingUser}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              border: 'none',
              cursor: locatingUser ? 'wait' : 'pointer',
              textAlign: 'left',
              transition: 'background 150ms ease',
              opacity: locatingUser ? 0.7 : 1,
            }}
            onMouseEnter={e => !locatingUser && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)')}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 40,
              height: 40,
              background: 'rgba(34, 197, 94, 0.15)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {locatingUser ? (
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  borderTopColor: '#22c55e',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#f8fafc', fontWeight: 500, fontSize: 14 }}>
                {isNearMeSearch ? 'Flights near your location' : geoSuggestion?.label}
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                {isNearMeSearch
                  ? locatingUser ? 'Getting your location...' : 'Uses your current GPS position'
                  : `Search within ${geoSuggestion?.radius}km radius`
                }
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Aircraft type suggestions - "B737", "A320", etc. */}
      {aircraftTypeSuggestions.length > 0 && (
        <div
          className="fade-in"
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '10px 16px',
            fontSize: 11,
            color: '#8b5cf6',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(139, 92, 246, 0.05)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            Aircraft Type
          </div>
          {aircraftTypeSuggestions.map(({ code, info }) => (
            <button
              key={code}
              onClick={() => handleAircraftTypeSelect(code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
                borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 36,
                height: 36,
                background: 'rgba(139, 92, 246, 0.15)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                fontWeight: 600,
                color: '#8b5cf6',
              }}>
                {code}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f8fafc', fontWeight: 500, fontSize: 14 }}>
                  {info.name}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {info.manufacturer} · {info.category.charAt(0).toUpperCase() + info.category.slice(1)}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Filter chips */}
      {open && results.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 10,
          marginBottom: 2,
        }}>
          {/* Status filters */}
          {(['all', 'airborne', 'ground'] as FilterType[]).map(f => {
            const count = f === 'all'
              ? results.length
              : f === 'airborne'
                ? results.filter(a => !a.onGround).length
                : results.filter(a => a.onGround).length
            const isActive = filter === f

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  background: isActive
                    ? f === 'airborne' ? 'rgba(34, 197, 94, 0.2)' : f === 'ground' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(14, 165, 233, 0.2)'
                    : 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${isActive
                    ? f === 'airborne' ? 'rgba(34, 197, 94, 0.4)' : f === 'ground' ? 'rgba(148, 163, 184, 0.4)' : 'rgba(14, 165, 233, 0.4)'
                    : 'rgba(148, 163, 184, 0.1)'}`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  color: isActive
                    ? f === 'airborne' ? '#22c55e' : f === 'ground' ? '#94a3b8' : '#0ea5e9'
                    : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                {f === 'airborne' && (
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                  }} />
                )}
                {f === 'ground' && (
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#94a3b8',
                  }} />
                )}
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                }}>
                  {count}
                </span>
              </button>
            )
          })}

          {/* Airline filter dropdown */}
          {airlinesInResults.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAirlineDropdown(!showAirlineDropdown)}
                style={{
                  padding: '6px 12px',
                  background: airlineFilter ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${airlineFilter ? 'rgba(139, 92, 246, 0.4)' : 'rgba(148, 163, 184, 0.1)'}`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  color: airlineFilter ? '#a78bfa' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                </svg>
                {airlineFilter ? AIRLINES[airlineFilter] : 'Airline'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAirlineDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} aria-hidden="true">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Airline dropdown menu */}
              {showAirlineDropdown && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                    onClick={() => setShowAirlineDropdown(false)}
                  />
                  <div
                    className="fade-in"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: 'rgba(30, 41, 59, 0.98)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      padding: 6,
                      zIndex: 1000,
                      minWidth: 200,
                      maxHeight: 240,
                      overflow: 'auto',
                    }}
                  >
                    {/* Clear filter option */}
                    {airlineFilter && (
                      <button
                        onClick={() => {
                          setAirlineFilter(null)
                          setShowAirlineDropdown(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: 12,
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          marginBottom: 4,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                        Clear filter
                      </button>
                    )}

                    {/* Airline options */}
                    {airlinesInResults.map(airline => (
                      <button
                        key={airline.code}
                        onClick={() => {
                          setAirlineFilter(airline.code)
                          setShowAirlineDropdown(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '8px 12px',
                          background: airlineFilter === airline.code ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: airlineFilter === airline.code ? '#a78bfa' : '#94a3b8',
                          fontSize: 12,
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => {
                          if (airlineFilter !== airline.code) e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                        }}
                        onMouseLeave={e => {
                          if (airlineFilter !== airline.code) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            padding: '2px 6px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#a78bfa',
                            fontFamily: 'monospace',
                          }}>
                            {airline.code}
                          </span>
                          {airline.name}
                        </span>
                        <span style={{
                          padding: '2px 6px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 10,
                          fontSize: 10,
                        }}>
                          {airline.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Altitude filter dropdown */}
          {results.filter(a => !a.onGround).length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAltitudeDropdown(!showAltitudeDropdown)}
                style={{
                  padding: '6px 12px',
                  background: altitudeFilter !== 'all' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${altitudeFilter !== 'all' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(148, 163, 184, 0.1)'}`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  color: altitudeFilter !== 'all' ? '#fbbf24' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2v20M2 12l4-4M2 12l4 4M22 12l-4-4M22 12l-4 4"/>
                </svg>
                {altitudeFilter !== 'all' ? ALTITUDE_RANGES[altitudeFilter].ftLabel : 'Altitude'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAltitudeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} aria-hidden="true">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Altitude dropdown menu */}
              {showAltitudeDropdown && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                    onClick={() => setShowAltitudeDropdown(false)}
                  />
                  <div
                    className="fade-in"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: 'rgba(30, 41, 59, 0.98)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      padding: 6,
                      zIndex: 1000,
                      minWidth: 180,
                    }}
                  >
                    {/* Clear filter option */}
                    {altitudeFilter !== 'all' && (
                      <button
                        onClick={() => {
                          setAltitudeFilter('all')
                          setShowAltitudeDropdown(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: 12,
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          marginBottom: 4,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                        Clear filter
                      </button>
                    )}

                    {/* Altitude options */}
                    {(['low', 'medium', 'high'] as const).map(level => {
                      const range = ALTITUDE_RANGES[level]
                      const count = altitudeDistribution[level]
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            setAltitudeFilter(level)
                            setShowAltitudeDropdown(false)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px 12px',
                            background: altitudeFilter === level ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: altitudeFilter === level ? '#fbbf24' : '#94a3b8',
                            fontSize: 12,
                            textAlign: 'left',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={e => {
                            if (altitudeFilter !== level) e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                          }}
                          onMouseLeave={e => {
                            if (altitudeFilter !== level) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: level === 'low' ? '#22c55e' : level === 'medium' ? '#f59e0b' : '#ef4444',
                            }} />
                            <span>
                              {range.label}
                              <span style={{ color: '#64748b', marginLeft: 6, fontSize: 10 }}>
                                {range.ftLabel}
                              </span>
                            </span>
                          </span>
                          <span style={{
                            padding: '2px 6px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 10,
                            fontSize: 10,
                          }}>
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Speed filter dropdown */}
          {results.filter(a => !a.onGround).length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
                style={{
                  padding: '6px 12px',
                  background: speedFilter !== 'all' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${speedFilter !== 'all' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(148, 163, 184, 0.1)'}`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  color: speedFilter !== 'all' ? '#22d3ee' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                {speedFilter !== 'all' ? SPEED_RANGES[speedFilter].ktsLabel : 'Speed'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showSpeedDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} aria-hidden="true">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Speed dropdown menu */}
              {showSpeedDropdown && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                    onClick={() => setShowSpeedDropdown(false)}
                  />
                  <div
                    className="fade-in"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: 'rgba(30, 41, 59, 0.98)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      padding: 6,
                      zIndex: 1000,
                      minWidth: 180,
                    }}
                  >
                    {/* Clear filter option */}
                    {speedFilter !== 'all' && (
                      <button
                        onClick={() => {
                          setSpeedFilter('all')
                          setShowSpeedDropdown(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: 12,
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          marginBottom: 4,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                        Clear filter
                      </button>
                    )}

                    {/* Speed options */}
                    {(['slow', 'medium', 'fast'] as const).map(level => {
                      const range = SPEED_RANGES[level]
                      const count = speedDistribution[level]
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            setSpeedFilter(level)
                            setShowSpeedDropdown(false)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px 12px',
                            background: speedFilter === level ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: speedFilter === level ? '#22d3ee' : '#94a3b8',
                            fontSize: 12,
                            textAlign: 'left',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={e => {
                            if (speedFilter !== level) e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                          }}
                          onMouseLeave={e => {
                            if (speedFilter !== level) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: level === 'slow' ? '#94a3b8' : level === 'medium' ? '#06b6d4' : '#8b5cf6',
                            }} />
                            <span>
                              {range.label}
                              <span style={{ color: '#64748b', marginLeft: 6, fontSize: 10 }}>
                                {range.ktsLabel}
                              </span>
                            </span>
                          </span>
                          <span style={{
                            padding: '2px 6px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 10,
                            fontSize: 10,
                          }}>
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Category filter dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              style={{
                padding: '6px 12px',
                background: categoryFilter !== 'all' ? `rgba(${categoryFilter === 'commercial' ? '14, 165, 233' : categoryFilter === 'cargo' ? '245, 158, 11' : categoryFilter === 'private' ? '34, 197, 94' : '239, 68, 68'}, 0.2)` : 'rgba(30, 41, 59, 0.8)',
                border: `1px solid ${categoryFilter !== 'all' ? `rgba(${categoryFilter === 'commercial' ? '14, 165, 233' : categoryFilter === 'cargo' ? '245, 158, 11' : categoryFilter === 'private' ? '34, 197, 94' : '239, 68, 68'}, 0.4)` : 'rgba(148, 163, 184, 0.1)'}`,
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                color: categoryFilter !== 'all' ? CATEGORY_INFO[categoryFilter].color : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 150ms ease',
              }}
            >
              <span style={{ fontSize: 11 }}>
                {categoryFilter !== 'all' ? CATEGORY_INFO[categoryFilter].icon : '🏷'}
              </span>
              {categoryFilter !== 'all' ? CATEGORY_INFO[categoryFilter].label : 'Category'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showCategoryDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} aria-hidden="true">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {/* Category dropdown menu */}
            {showCategoryDropdown && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                  onClick={() => setShowCategoryDropdown(false)}
                />
                <div
                  className="fade-in"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: 'rgba(30, 41, 59, 0.98)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 10,
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    padding: 6,
                    zIndex: 1000,
                    minWidth: 180,
                  }}
                >
                  {/* Clear filter option */}
                  {categoryFilter !== 'all' && (
                    <button
                      onClick={() => {
                        setCategoryFilter('all')
                        setShowCategoryDropdown(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: '#ef4444',
                        fontSize: 12,
                        textAlign: 'left',
                        transition: 'all 150ms ease',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        marginBottom: 4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                      Clear filter
                    </button>
                  )}

                  {/* Category options */}
                  {(['commercial', 'cargo', 'private', 'military'] as const).map(cat => {
                    const info = CATEGORY_INFO[cat]
                    const count = categoryDistribution[cat]
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategoryFilter(cat)
                          setShowCategoryDropdown(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '8px 12px',
                          background: categoryFilter === cat ? `${info.color}15` : 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: categoryFilter === cat ? info.color : '#94a3b8',
                          fontSize: 12,
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => {
                          if (categoryFilter !== cat) e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                        }}
                        onMouseLeave={e => {
                          if (categoryFilter !== cat) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{info.icon}</span>
                          {info.label}
                        </span>
                        <span style={{
                          padding: '2px 6px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 10,
                          fontSize: 10,
                        }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results dropdown */}
      {open && (
        <div
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className="fade-in"
          onMouseDown={e => e.preventDefault()} // Prevent blur when clicking inside dropdown
          style={{
            marginTop: 8,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            maxHeight: 320,
            overflow: 'auto',
          }}
        >
          {filteredResults.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
            }}>
              {query.length >= 2 ? (
                <div>
                  <div style={{
                    width: 48,
                    height: 48,
                    margin: '0 auto 14px',
                    background: 'rgba(148, 163, 184, 0.1)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" aria-hidden="true">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                      <path d="M8 11h6"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#f8fafc', marginBottom: 6 }}>
                    No flights found
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    No matches for "{query}"
                  </div>
                  {airlineSuggestions.length > 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Try clicking an airline suggestion above
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Try searching for
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['UAL', 'DAL', 'SWA', 'AAL'].map(code => (
                          <button
                            key={code}
                            onClick={() => {
                              const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
                              if (input) {
                                input.value = code
                                input.dispatchEvent(new Event('input', { bubbles: true }))
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(14, 165, 233, 0.1)',
                              border: '1px solid rgba(14, 165, 233, 0.2)',
                              borderRadius: 6,
                              color: '#0ea5e9',
                              fontSize: 12,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
                            }}
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{
                padding: '10px 16px',
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>
                  {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                  {filter !== 'all' && ` · ${filter}`}
                  {airlineFilter && ` · ${AIRLINES[airlineFilter]}`}
                  {altitudeFilter !== 'all' && ` · ${ALTITUDE_RANGES[altitudeFilter].ftLabel}`}
                  {speedFilter !== 'all' && ` · ${SPEED_RANGES[speedFilter].ktsLabel}`}
                  {categoryFilter !== 'all' && ` · ${CATEGORY_INFO[categoryFilter].label}`}
                </span>
                {(filter !== 'all' || airlineFilter || altitudeFilter !== 'all' || speedFilter !== 'all' || categoryFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setFilter('all')
                      setAirlineFilter(null)
                      setAltitudeFilter('all')
                      setSpeedFilter('all')
                      setCategoryFilter('all')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(148, 163, 184, 0.2)'
                      e.currentTarget.style.color = '#f8fafc'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#64748b'
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {filteredResults.map((a, index) => (
                <div
                  key={a.icao24}
                  onClick={() => handleSelect(a)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                    transition: 'background 150ms ease',
                    background: index === selectedIndex ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
                    setSelectedIndex(index)
                  }}
                  onMouseLeave={e => {
                    if (index !== selectedIndex) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        background: a.onGround ? 'rgba(148, 163, 184, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={a.onGround ? '#94a3b8' : '#22c55e'}
                          strokeWidth="2"
                          aria-hidden="true"
                          style={{
                            transform: a.onGround ? 'rotate(0deg)' : `rotate(${(a.heading || 0) - 45}deg)`,
                          }}
                        >
                          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                        </svg>
                      </div>
                      <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: 15 }}>
                        {a.callsign || a.icao24}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: a.onGround ? 'rgba(148, 163, 184, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: a.onGround ? '#94a3b8' : '#22c55e',
                      fontWeight: 500,
                    }}>
                      {a.onGround ? 'Ground' : 'Airborne'}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#64748b',
                    marginTop: 6,
                    marginLeft: 42,
                  }}>
                    {getAirline(a.callsign) || `ICAO: ${a.icao24}`}
                    {a.type && (
                      <span style={{ color: '#8b5cf6', fontWeight: 500 }}>
                        {' '}· {a.type}
                      </span>
                    )}
                    {!a.onGround && a.altitude && (
                      <span style={{ color: '#94a3b8' }}>
                        {' '}· {Math.round(a.altitude * 3.281).toLocaleString()} ft
                      </span>
                    )}
                    {!a.onGround && a.velocity && (
                      <span style={{ color: '#94a3b8' }}>
                        {' '}· {Math.round(a.velocity * 1.944)} kts
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Keyboard hint */}
      {open && filteredResults.length > 0 && (
        <div style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          fontSize: 11,
          color: '#475569',
        }}>
          <span><kbd style={kbdStyle}>↑↓</kbd> navigate</span>
          <span><kbd style={kbdStyle}>Enter</kbd> select</span>
          <span><kbd style={kbdStyle}>Esc</kbd> close</span>
        </div>
      )}
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  background: 'rgba(30, 41, 59, 0.8)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: 4,
  fontSize: 10,
  fontFamily: 'monospace',
  marginRight: 4,
}
