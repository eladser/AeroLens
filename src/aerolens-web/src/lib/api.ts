import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface FetchOptions extends RequestInit {
  authenticated?: boolean
  timeout?: number
  retries?: number
}

const DEFAULT_TIMEOUT = 10000 // 10 seconds
const DEFAULT_RETRIES = 2
const RETRY_DELAY_BASE = 1000 // 1 second base delay

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Retry on network errors and timeouts
    if (error.name === 'AbortError') return true
    if (error.message.includes('fetch')) return true
    if (error.message.includes('network')) return true
  }
  return false
}

function isRetryableStatus(status: number): boolean {
  // Retry on server errors and rate limiting
  return status === 429 || status === 502 || status === 503 || status === 504
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Custom error for rate limiting
export class RateLimitError extends Error {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message)
    this.name = 'RateLimitError'
  }
}

// Helper to check if an error is rate limiting
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError ||
    (error instanceof Error && error.message.includes('429'))
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    authenticated = false,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    headers = {},
    ...fetchOptions
  } = options

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection header
    ...headers,
  }

  if (authenticated) {
    const token = await getAuthToken()
    if (token) {
      (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const url = `${API_URL}${endpoint}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        { ...fetchOptions, headers: requestHeaders },
        timeout
      )

      if (!response.ok) {
        // Check if we should retry based on status code
        if (isRetryableStatus(response.status) && attempt < retries) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt)
          await sleep(delay)
          continue
        }

        // Throw specific error for rate limiting
        if (response.status === 429) {
          throw new RateLimitError()
        }

        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      if (isRetryableError(error) && attempt < retries) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error('Request failed after retries')
}

// Aircraft endpoints
export interface AircraftState {
  icao24: string
  callsign: string
  lat: number
  lon: number
  altitude: number
  velocity: number
  heading: number
  onGround: boolean
}

export interface AircraftResponse {
  timestamp: string
  count: number
  aircraft: AircraftState[]
}

export interface SearchResponse {
  results: AircraftState[]
}

export async function getAircraft(): Promise<AircraftResponse> {
  return apiFetch<AircraftResponse>('/api/aircraft')
}

export async function searchAircraft(query: string): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(`/api/aircraft/search?q=${encodeURIComponent(query)}`)
}

export async function getAircraftTrack(icao24: string): Promise<{ path: [number, number, number][] }> {
  return apiFetch(`/api/aircraft/${icao24}/track`)
}

// Weather endpoint
export interface WeatherResponse {
  description: string
  icon: string
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  cached: boolean
}

export async function getWeather(lat: number, lon: number): Promise<WeatherResponse> {
  return apiFetch<WeatherResponse>(`/api/weather?lat=${lat}&lon=${lon}`)
}

// Weather forecast endpoint
export interface ForecastDay {
  date: string
  dayName: string
  description: string
  icon: string
  tempMax: number
  tempMin: number
  precipitationProbability: number
  windSpeedMax: number
}

export interface ForecastResponse {
  days: ForecastDay[]
  cached: boolean
}

export async function getWeatherForecast(lat: number, lon: number, days = 5): Promise<ForecastResponse> {
  return apiFetch<ForecastResponse>(`/api/weather/forecast?lat=${lat}&lon=${lon}&days=${days}`)
}

// Prediction endpoint
export interface PredictionResponse {
  risk: 'low' | 'medium' | 'high'
  confidence: number
  reason: string
  cached: boolean
}

export async function getDelayPrediction(
  lat: number,
  lon: number,
  altitude?: number,
  velocity?: number
): Promise<PredictionResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  if (altitude !== undefined) params.set('altitude', String(altitude))
  if (velocity !== undefined) params.set('velocity', String(velocity))
  return apiFetch<PredictionResponse>(`/api/predict?${params}`)
}

// User endpoint (authenticated)
export interface UserResponse {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/me', { authenticated: true })
}

// Health endpoints
export interface HealthResponse {
  status: string
  timestamp: string
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health')
}

export interface ApiHealthResponse {
  timestamp: string
  apis: {
    openSky: { ok: boolean; message: string; primary: boolean }
    adsbLol: { ok: boolean; message: string; fallback: boolean }
    openMeteo: { ok: boolean; message: string; primary: boolean }
    openWeatherMap: { ok: boolean; message: string; fallback: boolean }
    groq: { ok: boolean; message: string; primary: boolean }
    mistral: { ok: boolean; message: string; fallback: boolean }
    gemini: { ok: boolean; message: string; fallback: boolean }
  }
  allOk: boolean
}

export async function getApiHealth(): Promise<ApiHealthResponse> {
  return apiFetch<ApiHealthResponse>('/api/health/apis')
}

// Export the base URL for SignalR
export { API_URL }
