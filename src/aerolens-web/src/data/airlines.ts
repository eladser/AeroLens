export interface Airline {
  name: string
  iata: string
  country: string
  logoUrl?: string
}

const AIRLINES: Record<string, Airline> = {
  // US Airlines
  AAL: { name: 'American Airlines', iata: 'AA', country: 'US' },
  DAL: { name: 'Delta Air Lines', iata: 'DL', country: 'US' },
  UAL: { name: 'United Airlines', iata: 'UA', country: 'US' },
  SWA: { name: 'Southwest Airlines', iata: 'WN', country: 'US' },
  JBU: { name: 'JetBlue Airways', iata: 'B6', country: 'US' },
  ASA: { name: 'Alaska Airlines', iata: 'AS', country: 'US' },
  FFT: { name: 'Frontier Airlines', iata: 'F9', country: 'US' },
  NKS: { name: 'Spirit Airlines', iata: 'NK', country: 'US' },
  HAL: { name: 'Hawaiian Airlines', iata: 'HA', country: 'US' },

  // European Airlines
  BAW: { name: 'British Airways', iata: 'BA', country: 'GB' },
  AFR: { name: 'Air France', iata: 'AF', country: 'FR' },
  DLH: { name: 'Lufthansa', iata: 'LH', country: 'DE' },
  KLM: { name: 'KLM Royal Dutch', iata: 'KL', country: 'NL' },
  IBE: { name: 'Iberia', iata: 'IB', country: 'ES' },
  SAS: { name: 'Scandinavian Airlines', iata: 'SK', country: 'SE' },
  AZA: { name: 'ITA Airways', iata: 'AZ', country: 'IT' },
  SWR: { name: 'Swiss International', iata: 'LX', country: 'CH' },
  AUA: { name: 'Austrian Airlines', iata: 'OS', country: 'AT' },
  TAP: { name: 'TAP Air Portugal', iata: 'TP', country: 'PT' },
  EIN: { name: 'Aer Lingus', iata: 'EI', country: 'IE' },
  FIN: { name: 'Finnair', iata: 'AY', country: 'FI' },
  EZY: { name: 'easyJet', iata: 'U2', country: 'GB' },
  RYR: { name: 'Ryanair', iata: 'FR', country: 'IE' },
  VLG: { name: 'Vueling', iata: 'VY', country: 'ES' },
  WZZ: { name: 'Wizz Air', iata: 'W6', country: 'HU' },

  // Middle East Airlines
  UAE: { name: 'Emirates', iata: 'EK', country: 'AE' },
  QTR: { name: 'Qatar Airways', iata: 'QR', country: 'QA' },
  ETD: { name: 'Etihad Airways', iata: 'EY', country: 'AE' },
  THY: { name: 'Turkish Airlines', iata: 'TK', country: 'TR' },
  ELY: { name: 'El Al Israel', iata: 'LY', country: 'IL' },
  GFA: { name: 'Gulf Air', iata: 'GF', country: 'BH' },
  SVA: { name: 'Saudia', iata: 'SV', country: 'SA' },

  // Asia-Pacific Airlines
  CPA: { name: 'Cathay Pacific', iata: 'CX', country: 'HK' },
  SIA: { name: 'Singapore Airlines', iata: 'SQ', country: 'SG' },
  JAL: { name: 'Japan Airlines', iata: 'JL', country: 'JP' },
  ANA: { name: 'All Nippon Airways', iata: 'NH', country: 'JP' },
  KAL: { name: 'Korean Air', iata: 'KE', country: 'KR' },
  AAR: { name: 'Asiana Airlines', iata: 'OZ', country: 'KR' },
  CCA: { name: 'Air China', iata: 'CA', country: 'CN' },
  CES: { name: 'China Eastern', iata: 'MU', country: 'CN' },
  CSN: { name: 'China Southern', iata: 'CZ', country: 'CN' },
  EVA: { name: 'EVA Air', iata: 'BR', country: 'TW' },
  THA: { name: 'Thai Airways', iata: 'TG', country: 'TH' },
  MAS: { name: 'Malaysia Airlines', iata: 'MH', country: 'MY' },
  GIA: { name: 'Garuda Indonesia', iata: 'GA', country: 'ID' },
  PAL: { name: 'Philippine Airlines', iata: 'PR', country: 'PH' },
  VNA: { name: 'Vietnam Airlines', iata: 'VN', country: 'VN' },
  QFA: { name: 'Qantas', iata: 'QF', country: 'AU' },
  ANZ: { name: 'Air New Zealand', iata: 'NZ', country: 'NZ' },
  AIC: { name: 'Air India', iata: 'AI', country: 'IN' },

  // Americas (non-US)
  ACA: { name: 'Air Canada', iata: 'AC', country: 'CA' },
  WJA: { name: 'WestJet', iata: 'WS', country: 'CA' },
  AMX: { name: 'Aeromexico', iata: 'AM', country: 'MX' },
  VIV: { name: 'Viva Aerobus', iata: 'VB', country: 'MX' },
  VOI: { name: 'Volaris', iata: 'Y4', country: 'MX' },
  LAN: { name: 'LATAM Chile', iata: 'LA', country: 'CL' },
  TAM: { name: 'LATAM Brasil', iata: 'JJ', country: 'BR' },
  GLO: { name: 'Gol Linhas Aéreas', iata: 'G3', country: 'BR' },
  ARG: { name: 'Aerolíneas Argentinas', iata: 'AR', country: 'AR' },
  AVA: { name: 'Avianca', iata: 'AV', country: 'CO' },
  CMP: { name: 'Copa Airlines', iata: 'CM', country: 'PA' },

  // Cargo Airlines
  FDX: { name: 'FedEx Express', iata: 'FX', country: 'US' },
  UPS: { name: 'UPS Airlines', iata: '5X', country: 'US' },
  GTI: { name: 'Atlas Air', iata: '5Y', country: 'US' },
  ABW: { name: 'AirBridgeCargo', iata: 'RU', country: 'RU' },
  CLX: { name: 'Cargolux', iata: 'CV', country: 'LU' },
}

export function extractAirlineCode(callsign: string | null): string | null {
  if (!callsign) return null

  const clean = callsign.trim().toUpperCase()
  const prefix = clean.slice(0, 3)

  return AIRLINES[prefix] ? prefix : null
}

export function getAirlineFromCallsign(callsign: string | null): Airline | null {
  const code = extractAirlineCode(callsign)
  if (!code) return null
  return AIRLINES[code] || null
}

export function extractFlightNumber(callsign: string | null): string | null {
  if (!callsign) return null
  const match = callsign.trim().match(/[A-Z]{2,3}(\d+[A-Z]?)/)
  return match ? match[1] : null
}

export function formatFlightDisplay(callsign: string | null): string {
  if (!callsign) return 'Unknown'

  const airline = getAirlineFromCallsign(callsign)
  const flightNum = extractFlightNumber(callsign)

  if (airline && flightNum) {
    const shortName = airline.name.split(' ')[0]
    return `${shortName} ${flightNum}`
  }

  return callsign.trim()
}

export function isPrivateFlight(callsign: string | null): boolean {
  if (!callsign) return true

  const code = extractAirlineCode(callsign)
  if (code && AIRLINES[code]) return false

  const clean = callsign.trim().toUpperCase()
  if (/^N\d/.test(clean)) return true
  if (/^G-[A-Z]/.test(clean)) return true
  if (/^D-[A-Z]/.test(clean)) return true
  if (/^F-[A-Z]/.test(clean)) return true

  return true
}

export function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export { AIRLINES }
