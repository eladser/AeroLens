import { useEffect, useState, useMemo } from 'react'
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { getAircraftTrack } from '../lib/api'

interface Props {
  icao24: string
}

// Color interpolation from cyan (past) to indigo (present)
function interpolateColor(t: number): string {
  // Start: cyan (#06b6d4) → End: indigo (#6366f1)
  const r = Math.round(6 + (99 - 6) * t)
  const g = Math.round(182 + (102 - 182) * t)
  const b = Math.round(212 + (241 - 212) * t)
  return `rgb(${r}, ${g}, ${b})`
}

// Calculate distance between two points in km (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate total path distance
function calculateTotalDistance(path: [number, number][]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    total += calculateDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
  }
  return total
}

export function FlightTrail({ icao24 }: Props) {
  const [path, setPath] = useState<[number, number][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchTrack() {
      try {
        const data = await getAircraftTrack(icao24)
        if (!cancelled && data.path) {
          setPath(data.path.map((p: number[]) => [p[0], p[1]] as [number, number]))
        }
      } catch {
        // Trail is optional
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTrack()
    return () => { cancelled = true }
  }, [icao24])

  // Calculate total distance traveled
  const totalDistance = useMemo(() => {
    if (path.length < 2) return 0
    return calculateTotalDistance(path)
  }, [path])

  // Create gradient segments with color and opacity
  const segments = useMemo(() => {
    if (path.length < 2) return []

    const result = []
    for (let i = 0; i < path.length - 1; i++) {
      const t = i / (path.length - 1)
      const nextT = (i + 1) / (path.length - 1)
      const opacity = 0.4 + t * 0.5 // Fade from 0.4 to 0.9
      const color = interpolateColor((t + nextT) / 2)

      result.push({
        positions: [path[i], path[i + 1]] as [[number, number], [number, number]],
        color,
        opacity,
      })
    }
    return result
  }, [path])

  if (loading || path.length < 2) return null

  return (
    <>
      {/* Outer glow effect */}
      <Polyline
        positions={path}
        pathOptions={{
          color: '#6366f1',
          weight: 12,
          opacity: 0.08,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Inner glow effect */}
      <Polyline
        positions={path}
        pathOptions={{
          color: '#6366f1',
          weight: 6,
          opacity: 0.15,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Trail segments with color gradient */}
      {segments.map((segment, i) => (
        <Polyline
          key={i}
          positions={segment.positions}
          pathOptions={{
            color: segment.color,
            weight: 3,
            opacity: segment.opacity,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      ))}

      {/* Origin point marker with tooltip */}
      {path.length > 0 && (
        <CircleMarker
          center={path[0]}
          radius={6}
          pathOptions={{
            color: '#06b6d4',
            fillColor: '#1e293b',
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -8]}
            opacity={1}
            className="aircraft-tooltip"
            permanent={false}
          >
            <div style={{
              background: 'rgba(30, 41, 59, 0.98)',
              backdropFilter: 'blur(12px)',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(6, 182, 212, 0.2)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              minWidth: 100,
            }}>
              <div style={{
                fontSize: 10,
                color: '#06b6d4',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 4,
              }}>
                Track Start
              </div>
              <div style={{
                fontSize: 12,
                color: '#f8fafc',
                fontWeight: 500,
              }}>
                {totalDistance >= 1
                  ? `${Math.round(totalDistance)} km traveled`
                  : `${Math.round(totalDistance * 1000)} m traveled`}
              </div>
              <div style={{
                fontSize: 10,
                color: '#64748b',
                marginTop: 2,
              }}>
                {Math.round(totalDistance * 0.539957)} nm
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      )}

      {/* Trail dots showing progress - every ~5% of the path */}
      {path.filter((_, i) => i > 0 && i < path.length - 1 && i % Math.max(1, Math.floor(path.length / 20)) === 0).map((point, i) => {
        const pathIndex = path.indexOf(point)
        const t = pathIndex / (path.length - 1)
        const color = interpolateColor(t)
        const size = 1.5 + t * 1.5 // Size increases from 1.5 to 3

        return (
          <CircleMarker
            key={`dot-${i}`}
            center={point}
            radius={size}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.4 + t * 0.4,
              weight: 0,
            }}
          />
        )
      })}
    </>
  )
}
