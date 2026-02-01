import { useState, useMemo } from 'react'
import { useTrips, type Trip } from '../hooks/useTrips'
import { CreateTripModal } from './CreateTripModal'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'
import { ContextualHelp } from './ContextualHelp'
import { SwipeableListItem, type SwipeAction } from './SwipeableListItem'
import { useToast } from '../contexts/ToastContext'

interface Props {
  onClose: () => void
}

export function TripsPanel({ onClose }: Props) {
  const { trips, loading, createTrip, deleteTrip, shareTrip, removeFlightFromTrip, refresh } = useTrips()
  const { showToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress,
    isThresholdReached,
    handlers,
  } = usePullToRefresh({
    onRefresh: refresh,
    enabled: !loading,
  })

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1400,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="slide-up"
        style={{
          position: 'fixed',
          top: 64,
          right: 0,
          bottom: 0,
          width: 360,
          background: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
          backdropFilter: 'blur(12px)',
          borderLeft: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#f8fafc',
                letterSpacing: '-0.5px',
              }}>
                My Trips
              </h2>
              <ContextualHelp
                title="Trip Management"
                content="Organize your flights into trips to track your journeys. Add flights from the aircraft details panel and share trips with others."
                tips={[
                  'Pull down to refresh your trips list',
                  'Click a trip to expand and see its flights',
                  'Share trips via the trip options menu',
                ]}
                position="bottom"
              />
            </div>
            <p style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#64748b',
            }}>
              {trips.length} trip{trips.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(148, 163, 184, 0.1)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 22,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          ref={containerRef}
          {...handlers}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 20,
            position: 'relative',
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
            transition: pullDistance === 0 && !isRefreshing ? 'transform 200ms ease-out' : 'none',
          }}
        >
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            pullProgress={pullProgress}
            isRefreshing={isRefreshing}
            isThresholdReached={isThresholdReached}
          />
          {loading && !isRefreshing ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: 40,
            }}>
              <div className="pulse" style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              }} />
              <span style={{ color: '#64748b', fontSize: 14 }}>Loading trips...</span>
            </div>
          ) : trips.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
            }}>
              <div style={{
                width: 64,
                height: 64,
                background: 'rgba(14, 165, 233, 0.1)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#f8fafc',
              }}>
                No trips yet
              </h3>
              <p style={{
                margin: '8px 0 0',
                fontSize: 14,
                color: '#64748b',
                lineHeight: 1.5,
              }}>
                Create your first trip to start tracking flights and planning your journeys.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {trips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  expanded={expanded === trip.id}
                  onToggle={() => setExpanded(expanded === trip.id ? null : trip.id)}
                  onDelete={() => deleteTrip(trip.id)}
                  onShare={async () => {
                    const { shareUrl, error } = await shareTrip(trip.id)
                    if (error) {
                      showToast('Failed to share trip', 'error')
                    } else if (shareUrl) {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: trip.name,
                            text: `Check out my trip: ${trip.name}`,
                            url: shareUrl,
                          })
                        } catch {
                          await navigator.clipboard.writeText(shareUrl)
                          showToast('Share link copied to clipboard', 'success')
                        }
                      } else {
                        await navigator.clipboard.writeText(shareUrl)
                        showToast('Share link copied to clipboard', 'success')
                      }
                    }
                  }}
                  onRemoveFlight={removeFlightFromTrip}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 20,
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 150ms ease',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(14, 165, 233, 0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.3)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create New Trip
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateTripModal
          onClose={() => setShowCreate(false)}
          onCreate={createTrip}
        />
      )}
    </>
  )
}

function TripCard({
  trip,
  expanded,
  onToggle,
  onDelete,
  onShare,
  onRemoveFlight,
}: {
  trip: Trip
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onShare: () => void
  onRemoveFlight: (id: string) => void
}) {
  // Swipe actions for the trip card
  const leftActions: SwipeAction[] = useMemo(() => [
    {
      id: 'delete',
      label: 'Delete',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      ),
      color: '#ef4444',
      onAction: onDelete,
    },
  ], [onDelete])

  const rightActions: SwipeAction[] = useMemo(() => [
    {
      id: 'share',
      label: 'Share',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      color: '#0ea5e9',
      onAction: onShare,
    },
  ], [onShare])

  return (
    <SwipeableListItem
      leftActions={leftActions}
      rightActions={rightActions}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{
        background: expanded ? 'rgba(15, 23, 42, 0.5)' : 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'all 150ms ease',
      }}>
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          if (!expanded) e.currentTarget.style.background = 'rgba(14, 165, 233, 0.05)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'rgba(14, 165, 233, 0.1)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontWeight: 600,
              color: '#f8fafc',
              fontSize: 15,
            }}>
              {trip.name}
            </div>
            <div style={{
              fontSize: 12,
              color: '#64748b',
              marginTop: 2,
            }}>
              {trip.flights.length} flight{trip.flights.length !== 1 ? 's' : ''} tracked
            </div>
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 200ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          {trip.flights.length === 0 ? (
            <div style={{
              padding: '20px',
              color: '#64748b',
              fontSize: 13,
              textAlign: 'center',
            }}>
              No flights tracked yet. Select a flight on the map and add it to this trip.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {trip.flights.map(flight => (
                <div
                  key={flight.id}
                  style={{
                    padding: '10px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                    }} />
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 14,
                      color: '#f8fafc',
                      fontWeight: 500,
                    }}>
                      {flight.callsign}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFlight(flight.id) }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 6,
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
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 13,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete Trip
            </button>
          </div>
        </div>
      )}
      </div>
    </SwipeableListItem>
  )
}
