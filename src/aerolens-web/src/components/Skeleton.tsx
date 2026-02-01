import type { CSSProperties } from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className="shimmer"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.5) 25%, rgba(51, 65, 85, 0.5) 50%, rgba(30, 41, 59, 0.5) 75%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
    />
  )
}

export function SkeletonText({ lines = 1, lastLineWidth = '60%' }: { lines?: number; lastLineWidth?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height={12}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />
}

export function TripCardSkeleton() {
  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <Skeleton width={40} height={40} borderRadius={10} />
      <div style={{ flex: 1 }}>
        <Skeleton width={120} height={14} style={{ marginBottom: 8 }} />
        <Skeleton width={80} height={10} />
      </div>
      <Skeleton width={16} height={16} borderRadius={4} />
    </div>
  )
}

export function FlightCardSkeleton() {
  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Skeleton width={80} height={18} />
        <Skeleton width={50} height={20} borderRadius={999} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <Skeleton width={40} height={10} style={{ marginBottom: 6 }} />
          <Skeleton width={60} height={16} />
        </div>
        <div>
          <Skeleton width={40} height={10} style={{ marginBottom: 6 }} />
          <Skeleton width={50} height={16} />
        </div>
        <div>
          <Skeleton width={40} height={10} style={{ marginBottom: 6 }} />
          <Skeleton width={45} height={16} />
        </div>
      </div>
    </div>
  )
}

export function WeatherSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Skeleton width={32} height={32} borderRadius={8} />
      <div>
        <Skeleton width={60} height={14} style={{ marginBottom: 4 }} />
        <Skeleton width={40} height={10} />
      </div>
    </div>
  )
}

export function SearchResultSkeleton() {
  return (
    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Skeleton width={32} height={32} borderRadius={8} />
      <div style={{ flex: 1 }}>
        <Skeleton width={100} height={14} style={{ marginBottom: 6 }} />
        <Skeleton width={150} height={10} />
      </div>
    </div>
  )
}

export function NotificationSettingsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Skeleton width={120} height={14} style={{ marginBottom: 6 }} />
            <Skeleton width={180} height={10} />
          </div>
          <Skeleton width={44} height={24} borderRadius={12} />
        </div>
      ))}
    </div>
  )
}

export function DelayPredictionSkeleton() {
  return (
    <div
      style={{
        padding: 12,
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 8,
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Skeleton width={8} height={8} borderRadius="50%" />
          <Skeleton width={70} height={13} />
        </div>
        <Skeleton width={80} height={18} borderRadius={999} />
      </div>
      <Skeleton width="90%" height={12} style={{ marginBottom: 4 }} />
      <Skeleton width="60%" height={12} />
    </div>
  )
}
