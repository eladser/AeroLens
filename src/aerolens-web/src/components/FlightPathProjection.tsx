import { useMemo } from 'react'
import { Polyline, CircleMarker } from 'react-leaflet'
import type { Aircraft } from '../types/aircraft'

interface Props {
  aircraft: Aircraft
}

// Calculate a point at a given distance and bearing from a start point
function calculateEndpoint(lat: number, lon: number, heading: number, distanceKm: number): [number, number] {
  const R = 6371 // Earth's radius in km
  const d = distanceKm / R
  const headingRad = (heading * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lon * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(headingRad)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI]
}

export function FlightPathProjection({ aircraft }: Props) {
  const { lat, lon, heading, velocity, onGround } = aircraft

  // Calculate projected path based on heading and speed
  const projectedPath = useMemo(() => {
    // Don't show projection for grounded aircraft or if no heading
    if (onGround || heading === null || velocity === null) return null

    // Calculate projection distance based on speed (show ~10 minutes of flight)
    // velocity is in m/s, convert to km for 10 minutes
    const speedKmH = velocity * 3.6
    const projectionMinutes = 10
    const projectionDistanceKm = (speedKmH * projectionMinutes) / 60

    // Generate path points (current position + projected endpoint)
    const points: [number, number][] = [[lat, lon]]

    // Add intermediate points for a smoother line
    const numPoints = 5
    for (let i = 1; i <= numPoints; i++) {
      const distance = (projectionDistanceKm * i) / numPoints
      points.push(calculateEndpoint(lat, lon, heading, distance))
    }

    return points
  }, [lat, lon, heading, velocity, onGround])

  if (!projectedPath) return null

  return (
    <>
      {/* Pulsing highlight ring around selected aircraft */}
      <CircleMarker
        center={[lat, lon]}
        radius={25}
        pathOptions={{
          color: '#ef4444',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 2,
          opacity: 0.6,
          dashArray: '4, 4',
          className: 'pulse-ring',
        }}
      />

      {/* Inner glow ring */}
      <CircleMarker
        center={[lat, lon]}
        radius={18}
        pathOptions={{
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.1,
          weight: 1,
          opacity: 0.4,
        }}
      />

      {/* Projected path - dashed line showing direction of travel */}
      <Polyline
        positions={projectedPath}
        pathOptions={{
          color: '#ef4444',
          weight: 2,
          opacity: 0.4,
          dashArray: '8, 8',
          lineCap: 'round',
        }}
      />

      {/* Glow effect for projected path */}
      <Polyline
        positions={projectedPath}
        pathOptions={{
          color: '#ef4444',
          weight: 6,
          opacity: 0.1,
          lineCap: 'round',
        }}
      />

      {/* Endpoint marker (where aircraft will be in ~10 min) */}
      {projectedPath.length > 1 && (
        <CircleMarker
          center={projectedPath[projectedPath.length - 1]}
          radius={4}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#1e293b',
            fillOpacity: 1,
            weight: 2,
            opacity: 0.5,
          }}
        />
      )}

      {/* Small dots along projected path */}
      {projectedPath.slice(1, -1).map((point, i) => (
        <CircleMarker
          key={`proj-${i}`}
          center={point}
          radius={2}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.3,
            weight: 0,
          }}
        />
      ))}
    </>
  )
}
