const ICAO24_REGEX = /^[0-9a-fA-F]{6}$/
const SEARCH_QUERY_REGEX = /^[a-zA-Z0-9\-\s]{1,20}$/

export interface ValidationResult {
  valid: boolean
  error?: string
  value?: string
}

export function validateIcao24(icao24: string | null | undefined): ValidationResult {
  if (!icao24 || !icao24.trim()) {
    return { valid: false, error: 'ICAO24 address is required' }
  }

  const trimmed = icao24.trim()

  if (trimmed.length !== 6) {
    return { valid: false, error: 'ICAO24 address must be exactly 6 characters' }
  }

  if (!ICAO24_REGEX.test(trimmed)) {
    return { valid: false, error: 'ICAO24 address must contain only hexadecimal characters (0-9, a-f)' }
  }

  return { valid: true, value: trimmed.toLowerCase() }
}

export function validateLatitude(lat: number): ValidationResult {
  if (!Number.isFinite(lat)) {
    return { valid: false, error: 'Latitude must be a valid number' }
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' }
  }

  return { valid: true }
}

export function validateLongitude(lon: number): ValidationResult {
  if (!Number.isFinite(lon)) {
    return { valid: false, error: 'Longitude must be a valid number' }
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' }
  }

  return { valid: true }
}

export function validateSearchQuery(query: string | null | undefined): ValidationResult {
  if (!query || !query.trim()) {
    return { valid: false, error: 'Search query is required' }
  }

  const trimmed = query.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: 'Search query must be at least 2 characters' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Search query must be at most 20 characters' }
  }

  if (!SEARCH_QUERY_REGEX.test(trimmed)) {
    return { valid: false, error: 'Search query contains invalid characters' }
  }

  return { valid: true, value: trimmed }
}

export function sanitize(input: string | null | undefined): string {
  if (!input) return ''

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function sanitizeForUrl(input: string | null | undefined): string {
  if (!input) return ''
  return encodeURIComponent(input.trim())
}
