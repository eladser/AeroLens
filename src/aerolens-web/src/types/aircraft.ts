export interface Aircraft {
  icao24: string
  callsign: string | null
  lat: number
  lon: number
  altitude: number | null
  velocity: number | null
  heading: number | null
  onGround: boolean
  type?: string | null  // ICAO type code, e.g., "B738", "A320"
}

export interface AircraftResponse {
  timestamp: string
  count: number
  aircraft: Aircraft[]
}
