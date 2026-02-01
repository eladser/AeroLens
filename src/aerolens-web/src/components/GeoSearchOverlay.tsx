import { useEffect } from 'react'
import { Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { GeoSearch } from './SearchBox'

interface Props {
  geoSearch: GeoSearch
}

export function GeoSearchOverlay({ geoSearch }: Props) {
  const map = useMap()

  // Fit map to show the search area
  useEffect(() => {
    // Calculate bounds that show the search radius
    // 1 degree latitude ≈ 111 km
    const latDelta = geoSearch.radius / 111
    // 1 degree longitude ≈ 111 km * cos(lat)
    const lonDelta = geoSearch.radius / (111 * Math.cos(geoSearch.lat * Math.PI / 180))

    const bounds: [number, number][] = [
      [geoSearch.lat - latDelta, geoSearch.lon - lonDelta],
      [geoSearch.lat + latDelta, geoSearch.lon + lonDelta],
    ]
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 })
  }, [map, geoSearch.lat, geoSearch.lon, geoSearch.radius])

  return (
    <>
      {/* Search radius circle - outer glow */}
      <Circle
        center={[geoSearch.lat, geoSearch.lon]}
        radius={geoSearch.radius * 1000} // Convert km to meters
        pathOptions={{
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.05,
          weight: 2,
          opacity: 0.3,
        }}
      />

      {/* Search radius circle - main */}
      <Circle
        center={[geoSearch.lat, geoSearch.lon]}
        radius={geoSearch.radius * 1000} // Convert km to meters
        pathOptions={{
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.08,
          weight: 2,
          opacity: 0.6,
          dashArray: '8, 4',
        }}
      />

      {/* Center marker */}
      <CircleMarker
        center={[geoSearch.lat, geoSearch.lon]}
        radius={10}
        pathOptions={{
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.4,
          weight: 3,
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]}>
          <div style={{ textAlign: 'center', fontWeight: 600 }}>
            <div style={{ fontSize: 13, color: '#22c55e' }}>{geoSearch.label}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{geoSearch.radius} km radius</div>
          </div>
        </Tooltip>
      </CircleMarker>

      {/* Crosshairs at center */}
      <CircleMarker
        center={[geoSearch.lat, geoSearch.lon]}
        radius={3}
        pathOptions={{
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 1,
          weight: 2,
        }}
      />
    </>
  )
}
