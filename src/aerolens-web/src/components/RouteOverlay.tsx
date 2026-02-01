import { useMemo } from 'react'
import { Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { RouteSearch } from './SearchBox'

interface Props {
  route: RouteSearch
}

// Calculate distance between two points in kilometers using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Format distance for display
function formatDistance(km: number): string {
  const nm = km * 0.539957 // Nautical miles
  const mi = km * 0.621371 // Statute miles
  return `${Math.round(km).toLocaleString()} km · ${Math.round(nm).toLocaleString()} nm · ${Math.round(mi).toLocaleString()} mi`
}

// Generate great circle path points
function generateGreatCirclePath(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints = 100
): [number, number][] {
  const points: [number, number][] = []

  // Convert to radians
  const lat1Rad = (lat1 * Math.PI) / 180
  const lon1Rad = (lon1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180
  const lon2Rad = (lon2 * Math.PI) / 180

  // Calculate angular distance
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat1Rad - lat2Rad) / 2), 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.pow(Math.sin((lon1Rad - lon2Rad) / 2), 2)
    )
  )

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)

    const x = A * Math.cos(lat1Rad) * Math.cos(lon1Rad) + B * Math.cos(lat2Rad) * Math.cos(lon2Rad)
    const y = A * Math.cos(lat1Rad) * Math.sin(lon1Rad) + B * Math.cos(lat2Rad) * Math.sin(lon2Rad)
    const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad)

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lon = Math.atan2(y, x)

    points.push([(lat * 180) / Math.PI, (lon * 180) / Math.PI])
  }

  return points
}

export function RouteOverlay({ route }: Props) {
  const map = useMap()

  const { origin, destination } = route

  // Calculate route data
  const routeData = useMemo(() => {
    const distance = calculateDistance(origin.lat, origin.lon, destination.lat, destination.lon)
    const path = generateGreatCirclePath(origin.lat, origin.lon, destination.lat, destination.lon)
    return { distance, path }
  }, [origin, destination])

  // Fit map to show the entire route with padding
  useMemo(() => {
    const bounds: [number, number][] = [
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
    ]
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 8 })
  }, [map, origin, destination])

  return (
    <>
      {/* Great circle route line */}
      <Polyline
        positions={routeData.path}
        pathOptions={{
          color: '#f97316',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 6',
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Route glow effect */}
      <Polyline
        positions={routeData.path}
        pathOptions={{
          color: '#f97316',
          weight: 8,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Origin airport marker */}
      <CircleMarker
        center={[origin.lat, origin.lon]}
        radius={12}
        pathOptions={{
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: 0.3,
          weight: 3,
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -12]}>
          <div style={{ textAlign: 'center', fontWeight: 600 }}>
            <div style={{ fontSize: 14, color: '#f97316' }}>{origin.iata}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{origin.city}</div>
          </div>
        </Tooltip>
      </CircleMarker>

      {/* Destination airport marker */}
      <CircleMarker
        center={[destination.lat, destination.lon]}
        radius={12}
        pathOptions={{
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: 0.3,
          weight: 3,
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -12]}>
          <div style={{ textAlign: 'center', fontWeight: 600 }}>
            <div style={{ fontSize: 14, color: '#f97316' }}>{destination.iata}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{destination.city}</div>
          </div>
        </Tooltip>
      </CircleMarker>

      {/* Distance label at midpoint */}
      <CircleMarker
        center={routeData.path[Math.floor(routeData.path.length / 2)]}
        radius={0}
        pathOptions={{ opacity: 0, fillOpacity: 0 }}
      >
        <Tooltip permanent direction="top" offset={[0, -5]}>
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.95)',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              color: '#f8fafc',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {formatDistance(routeData.distance)}
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  )
}
