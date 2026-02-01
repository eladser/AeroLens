interface Props {
  pullDistance: number
  pullProgress: number
  isRefreshing: boolean
  isThresholdReached: boolean
}

export function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  isRefreshing,
  isThresholdReached,
}: Props) {
  if (pullDistance === 0 && !isRefreshing) return null

  const rotation = isRefreshing ? 0 : pullProgress * 270
  const scale = Math.min(0.5 + pullProgress * 0.5, 1)
  const opacity = Math.min(pullProgress * 1.5, 1)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: pullDistance,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: isRefreshing ? 'none' : 'height 200ms ease-out',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: isThresholdReached || isRefreshing
            ? 'rgba(14, 165, 233, 0.15)'
            : 'rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
          opacity,
          transition: 'background 150ms ease, transform 150ms ease',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isThresholdReached || isRefreshing ? '#0ea5e9' : '#94a3b8'}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transform: `rotate(${rotation}deg)`,
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            transition: isRefreshing ? 'none' : 'transform 50ms linear',
          }}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>

      {isThresholdReached && !isRefreshing && (
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            fontSize: 11,
            color: '#0ea5e9',
            fontWeight: 500,
            opacity: 0.8,
          }}
        >
          Release to refresh
        </span>
      )}

      {isRefreshing && (
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            fontSize: 11,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          Refreshing...
        </span>
      )}
    </div>
  )
}
