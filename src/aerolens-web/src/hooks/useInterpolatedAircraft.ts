import { useEffect, useRef, useState } from 'react'
import type { Aircraft } from '../types/aircraft'

const INTERPOLATION_DURATION = 28000 // Slightly less than 30s API refresh
const STATE_UPDATE_INTERVAL = 66 // ~15fps, reduces re-renders

interface InterpolationState {
  start: { lat: number; lon: number; heading: number | null }
  end: { lat: number; lon: number; heading: number | null }
  startTime: number
}

interface Props {
  aircraft: Aircraft[]
  enabled?: boolean
}

interface InterpolatedResult {
  aircraft: Aircraft[]
}

function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360
  while (angle < -180) angle += 360
  return angle
}

function interpolateAngle(start: number | null, end: number | null, t: number): number | null {
  if (start === null || end === null) return end

  const diff = normalizeAngle(end - start)
  return normalizeAngle(start + diff * t)
}

export function useInterpolatedAircraft({ aircraft, enabled = true }: Props): InterpolatedResult {
  const [interpolated, setInterpolated] = useState<Aircraft[]>(aircraft)
  const stateRef = useRef<Map<string, InterpolationState>>(new Map())
  const lastAircraftRef = useRef<Aircraft[]>(aircraft)
  const enabledRef = useRef(enabled)
  const lastUpdateTimeRef = useRef(0)
  const interpolatedCacheRef = useRef<Aircraft[]>(aircraft)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setInterpolated(aircraft)
      interpolatedCacheRef.current = aircraft
      return
    }

    const now = performance.now()
    const newState = new Map<string, InterpolationState>()
    const currentState = stateRef.current

    aircraft.forEach(a => {
      const prevState = currentState.get(a.icao24)

      if (prevState) {
        const elapsed = now - prevState.startTime
        const rawT = Math.min(elapsed / INTERPOLATION_DURATION, 1)

        const currentLat = prevState.start.lat + (prevState.end.lat - prevState.start.lat) * rawT
        const currentLon = prevState.start.lon + (prevState.end.lon - prevState.start.lon) * rawT
        const currentHeading = interpolateAngle(prevState.start.heading, prevState.end.heading, rawT)

        newState.set(a.icao24, {
          start: {
            lat: currentLat,
            lon: currentLon,
            heading: currentHeading,
          },
          end: {
            lat: a.lat,
            lon: a.lon,
            heading: a.heading,
          },
          startTime: now,
        })
      } else {
        newState.set(a.icao24, {
          start: { lat: a.lat, lon: a.lon, heading: a.heading },
          end: { lat: a.lat, lon: a.lon, heading: a.heading },
          startTime: now,
        })
      }
    })

    stateRef.current = newState
    lastAircraftRef.current = aircraft
  }, [aircraft, enabled])

  useEffect(() => {
    if (!enabled) return

    let animationId: number

    function animate() {
      if (!enabledRef.current) return

      const now = performance.now()
      const aircraftData = lastAircraftRef.current
      const state = stateRef.current

      const result = aircraftData.map(a => {
        const interpState = state.get(a.icao24)
        if (!interpState) return a

        const elapsed = now - interpState.startTime
        const t = Math.min(elapsed / INTERPOLATION_DURATION, 1)

        return {
          ...a,
          lat: interpState.start.lat + (interpState.end.lat - interpState.start.lat) * t,
          lon: interpState.start.lon + (interpState.end.lon - interpState.start.lon) * t,
          heading: interpolateAngle(interpState.start.heading, interpState.end.heading, t),
        }
      })

      interpolatedCacheRef.current = result

      if (now - lastUpdateTimeRef.current >= STATE_UPDATE_INTERVAL) {
        lastUpdateTimeRef.current = now
        setInterpolated(result)
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [enabled])

  return { aircraft: enabled ? interpolated : aircraft }
}
