import type { TrackedFlight } from '../hooks/useTrips'

interface Props {
  flights: TrackedFlight[]
  onRemoveFlight?: (id: string) => void
}

export function TripTimeline({ flights, onRemoveFlight }: Props) {
  if (flights.length === 0) {
    return (
      <div style={{
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        {/* Empty state icon */}
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 16px',
            background: 'rgba(14, 165, 233, 0.1)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
        </div>

        <h4 style={{
          margin: '0 0 8px',
          fontSize: 15,
          fontWeight: 600,
          color: '#f8fafc',
        }}>
          No flights tracked yet
        </h4>

        <p style={{
          margin: '0 0 16px',
          fontSize: 13,
          color: '#64748b',
          lineHeight: 1.5,
        }}>
          Add flights to build your trip timeline
        </p>

        {/* Steps */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          textAlign: 'left',
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94a3b8' }}>
            <span style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#0ea5e9',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>1</span>
            Select a flight on the map
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94a3b8' }}>
            <span style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#0ea5e9',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>2</span>
            Click "Add to Trip" in flight details
          </div>
        </div>
      </div>
    )
  }

  // Sort flights by added_at
  const sortedFlights = [...flights].sort(
    (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
  )

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: 15,
            top: 20,
            bottom: 20,
            width: 2,
            background: 'linear-gradient(to bottom, rgba(14, 165, 233, 0.5), rgba(99, 102, 241, 0.5))',
            borderRadius: 1,
          }}
        />

        {/* Flight cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sortedFlights.map((flight, index) => (
            <TimelineCard
              key={flight.id}
              flight={flight}
              previousFlight={index > 0 ? sortedFlights[index - 1] : undefined}
              index={index}
              total={sortedFlights.length}
              onRemove={onRemoveFlight ? () => onRemoveFlight(flight.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineCard({
  flight,
  previousFlight,
  index,
  total,
  onRemove,
}: {
  flight: TrackedFlight
  previousFlight?: TrackedFlight
  index: number
  total: number
  onRemove?: () => void
}) {
  const addedDate = new Date(flight.added_at)
  const isFirst = index === 0
  const isLast = index === total - 1

  // Format the added date with timezone
  const dateStr = addedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const timeStr = addedDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  // Get timezone abbreviation (e.g., EST, PST, UTC)
  const tzStr = addedDate.toLocaleTimeString('en-US', {
    timeZoneName: 'short',
  }).split(' ').pop() || ''

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      {/* Timeline node */}
      <div
        style={{
          width: 32,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isFirst
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : isLast
                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            boxShadow: isFirst
              ? '0 0 8px rgba(34, 197, 94, 0.5)'
              : isLast
                ? '0 0 8px rgba(99, 102, 241, 0.5)'
                : '0 0 8px rgba(14, 165, 233, 0.5)',
            border: '2px solid rgba(15, 23, 42, 0.8)',
          }}
        />
      </div>

      {/* Card content */}
      <div
        style={{
          flex: 1,
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: 10,
          padding: '12px 14px',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'
          e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)'
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* Flight label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: isFirst
                    ? 'rgba(34, 197, 94, 0.15)'
                    : isLast
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'rgba(14, 165, 233, 0.15)',
                  color: isFirst ? '#22c55e' : isLast ? '#818cf8' : '#0ea5e9',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {isFirst ? 'First' : isLast && total > 1 ? 'Latest' : `Flight ${index + 1}`}
              </span>
            </div>

            {/* Callsign */}
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 16,
                fontWeight: 600,
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
              {flight.callsign}
            </div>

            {/* Added timestamp */}
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Added {dateStr} at {timeStr} {tzStr}
            </div>
          </div>

          {/* Remove button */}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#64748b'
              }}
              title="Remove from trip"
              aria-label="Remove flight from trip"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>

        {/* Layover indicator (if not first) */}
        {previousFlight && (
          <LayoverIndicator
            previousFlight={previousFlight}
            currentFlight={flight}
          />
        )}
      </div>
    </div>
  )
}

function LayoverIndicator({
  previousFlight,
  currentFlight,
}: {
  previousFlight: TrackedFlight
  currentFlight: TrackedFlight
}) {
  const prevTime = new Date(previousFlight.added_at).getTime()
  const currTime = new Date(currentFlight.added_at).getTime()
  const diffMs = currTime - prevTime
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  // Only show if there's a meaningful gap (more than 5 minutes)
  if (diffMs < 5 * 60 * 1000) return null

  let timeText = ''
  if (diffHours > 0) {
    timeText = `${diffHours}h ${diffMins}m`
  } else {
    timeText = `${diffMins}m`
  }

  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px dashed rgba(148, 163, 184, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: '#64748b',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
      <span>{timeText} after previous flight was added</span>
    </div>
  )
}
