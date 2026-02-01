import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import type { Aircraft } from '../types/aircraft'

interface Props {
  aircraft: Aircraft[]
  visible: boolean
  radius?: number
  blur?: number
  maxZoom?: number
}

export function HeatmapLayer({ aircraft, visible, radius = 25, blur = 15, maxZoom = 18 }: Props) {
  const map = useMap()
  const heatLayerRef = useRef<L.HeatLayer | null>(null)

  useEffect(() => {
    if (!visible) {
      // Remove heatmap when not visible
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
        heatLayerRef.current = null
      }
      return
    }

    // Convert aircraft positions to heatmap points
    // Format: [lat, lon, intensity]
    // Higher altitude aircraft get lower intensity (they're less "dense" at ground level view)
    const points: [number, number, number][] = aircraft.map((a) => {
      // Calculate intensity based on altitude (lower = more intense)
      // and whether on ground (ground aircraft more intense)
      let intensity = 1.0
      if (!a.onGround && a.altitude !== null) {
        // Reduce intensity for higher altitude aircraft
        // 0-3000m: full intensity
        // 3000-10000m: reduced intensity
        // 10000m+: minimum intensity
        if (a.altitude > 10000) {
          intensity = 0.3
        } else if (a.altitude > 3000) {
          intensity = 0.6
        }
      }
      return [a.lat, a.lon, intensity]
    })

    // Create or update heatmap layer
    if (heatLayerRef.current) {
      // Update existing layer
      heatLayerRef.current.setLatLngs(points)
    } else {
      // Create new heatmap layer with custom gradient (orange theme to match route styling)
      heatLayerRef.current = L.heatLayer(points, {
        radius,
        blur,
        maxZoom,
        gradient: {
          0.0: '#1e293b',   // Slate (background)
          0.2: '#3b82f6',   // Blue
          0.4: '#06b6d4',   // Cyan
          0.6: '#22c55e',   // Green
          0.8: '#f59e0b',   // Amber
          1.0: '#ef4444',   // Red (hot spots)
        },
      }).addTo(map)
    }

    return () => {
      // Cleanup on unmount
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
        heatLayerRef.current = null
      }
    }
  }, [map, aircraft, visible, radius, blur, maxZoom])

  return null
}
