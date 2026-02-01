import { useEffect, useState, useRef } from 'react'
import { getDelayPrediction, isRateLimitError, type PredictionResponse } from '../lib/api'
import { DelayPredictionSkeleton } from './Skeleton'

interface Props {
  lat: number
  lon: number
  altitude: number | null
  velocity: number | null
}

function roundCoord(val: number, precision = 2): number {
  return Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision)
}

const riskStyles = {
  low: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
    text: '#22c55e',
    icon: '#22c55e',
  },
  medium: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#f59e0b',
    icon: '#f59e0b',
  },
  high: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#ef4444',
    icon: '#ef4444',
  },
}

export function DelayPrediction({ lat, lon, altitude, velocity }: Props) {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [rateLimited, setRateLimited] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const lastFetchRef = useRef<string>('')

  const roundedLat = roundCoord(lat)
  const roundedLon = roundCoord(lon)
  const roundedAlt = altitude ? Math.round(altitude / 100) * 100 : null
  const roundedVel = velocity ? Math.round(velocity / 10) * 10 : null

  useEffect(() => {
    const fetchKey = `${roundedLat}-${roundedLon}-${roundedAlt}-${roundedVel}`
    if (fetchKey === lastFetchRef.current && prediction) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = window.setTimeout(async () => {
      if (fetchKey === lastFetchRef.current && prediction) return

      lastFetchRef.current = fetchKey
      setLoading(true)
      setRateLimited(false)

      try {
        const data = await getDelayPrediction(roundedLat, roundedLon, roundedAlt ?? undefined, roundedVel ?? undefined)
        setPrediction(data)
      } catch (err) {
        if (isRateLimitError(err)) setRateLimited(true)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [roundedLat, roundedLon, roundedAlt, roundedVel, prediction])

  if (loading && !prediction) {
    return <DelayPredictionSkeleton />
  }

  if (rateLimited) {
    return (
      <div style={{
        padding: 12,
        background: 'rgba(148, 163, 184, 0.1)',
        borderRadius: 8,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>
            Predictions temporarily unavailable
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            API limit reached. Will retry shortly.
          </div>
        </div>
      </div>
    )
  }

  if (!prediction) {
    return (
      <div style={{ color: '#64748b', fontSize: 13 }}>
        Prediction unavailable
      </div>
    )
  }

  const style = riskStyles[prediction.risk] || riskStyles.low

  return (
    <div style={{
      padding: 12,
      background: style.bg,
      borderRadius: 8,
      border: `1px solid ${style.border}`,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {/* Risk icon - not color alone for accessibility */}
          {prediction.risk === 'low' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : prediction.risk === 'medium' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: style.text,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {prediction.risk} Risk
          </span>
        </div>
        <span style={{
          fontSize: 11,
          color: '#94a3b8',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '2px 8px',
          borderRadius: 999,
        }}>
          {prediction.confidence}% confidence
        </span>
      </div>
      <div style={{
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 1.5,
      }}>
        {prediction.reason}
      </div>
    </div>
  )
}
