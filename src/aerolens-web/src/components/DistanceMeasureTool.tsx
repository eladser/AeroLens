import { useEffect, useRef, useState, useCallback } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useHaptic } from '../hooks/useHaptic'

interface Props {
  active: boolean
  onActiveChange: (active: boolean) => void
}

interface MeasurementPoint {
  latlng: L.LatLng
  marker: L.CircleMarker
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  if (km < 100) {
    return `${km.toFixed(1)} km (${(km * 0.539957).toFixed(1)} nm)`
  }
  return `${Math.round(km)} km (${Math.round(km * 0.539957)} nm)`
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

  let bearing = Math.atan2(y, x) * 180 / Math.PI
  bearing = (bearing + 360) % 360
  return bearing
}

export function DistanceMeasureTool({ active, onActiveChange }: Props) {
  const map = useMap()
  const { tap } = useHaptic()
  const [points, setPoints] = useState<MeasurementPoint[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const labelRef = useRef<L.Marker | null>(null)
  const [totalDistance, setTotalDistance] = useState(0)

  useMapEvents({
    click: (e) => {
      if (!active) return

      tap()

      const marker = L.circleMarker(e.latlng, {
        radius: 6,
        fillColor: '#0ea5e9',
        fillOpacity: 1,
        color: '#fff',
        weight: 2,
      }).addTo(map)

      marker.on('dblclick', () => {
        map.removeLayer(marker)
        setPoints(prev => prev.filter(p => p.marker !== marker))
      })

      setPoints(prev => [...prev, { latlng: e.latlng, marker }])
    },
  })

  useEffect(() => {
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }
    if (labelRef.current) {
      map.removeLayer(labelRef.current)
      labelRef.current = null
    }

    if (points.length < 2) {
      setTotalDistance(0)
      return
    }

    let total = 0
    const latlngs = points.map(p => p.latlng)

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1].latlng
      const p2 = points[i].latlng
      total += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng)
    }
    setTotalDistance(total)

    polylineRef.current = L.polyline(latlngs, {
      color: '#0ea5e9',
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 5',
    }).addTo(map)

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1].latlng
      const p2 = points[i].latlng
      const midLat = (p1.lat + p2.lat) / 2
      const midLng = (p1.lng + p2.lng) / 2
      const segmentDist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng)
      const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng)

      const icon = L.divIcon({
        className: 'distance-label',
        html: `<div style="
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(8px);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          font-size: 11px;
          font-weight: 500;
          color: #f8fafc;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${formatDistance(segmentDist)}<br/>
          <span style="color: #94a3b8; font-size: 10px;">${Math.round(bearing)}°</span>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      L.marker([midLat, midLng], { icon, interactive: false }).addTo(map)
    }

    return () => {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
      }
    }
  }, [points, map])

  useEffect(() => {
    if (!active) {
      points.forEach(p => {
        map.removeLayer(p.marker)
      })
      setPoints([])

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
        polylineRef.current = null
      }

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const icon = layer.getIcon()
          if (icon instanceof L.DivIcon && icon.options.className === 'distance-label') {
            map.removeLayer(layer)
          }
        }
      })

      setTotalDistance(0)
    }
  }, [active, map])

  const clearMeasurements = useCallback(() => {
    tap()
    points.forEach(p => {
      map.removeLayer(p.marker)
    })
    setPoints([])

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const icon = layer.getIcon()
        if (icon instanceof L.DivIcon && icon.options.className === 'distance-label') {
          map.removeLayer(layer)
        }
      }
    })
  }, [points, map, tap])

  if (!active) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div>
        <div style={{
          fontSize: 11,
          color: '#94a3b8',
          marginBottom: 2,
          fontWeight: 500,
        }}>
          Measurement Mode
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#f8fafc',
        }}>
          {points.length === 0 ? (
            'Click on map to start'
          ) : points.length === 1 ? (
            'Click another point'
          ) : (
            <>Total: {formatDistance(totalDistance)}</>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {points.length > 0 && (
          <button
            onClick={clearMeasurements}
            style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 6,
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            Clear
          </button>
        )}
        <button
          onClick={() => onActiveChange(false)}
          style={{
            padding: '6px 12px',
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
