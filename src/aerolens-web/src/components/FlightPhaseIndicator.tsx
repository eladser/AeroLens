interface Props {
  altitude: number | null // meters
  velocity: number | null // m/s
  onGround: boolean
  verticalRate?: number | null // m/s (positive = climbing)
}

type FlightPhase = 'ground' | 'takeoff' | 'climb' | 'cruise' | 'descent' | 'approach' | 'landing'

const PHASE_CONFIG: Record<FlightPhase, { label: string; color: string; icon: string; progress: number }> = {
  ground: { label: 'On Ground', color: '#94a3b8', icon: '🛫', progress: 0 },
  takeoff: { label: 'Taking Off', color: '#22c55e', icon: '🛫', progress: 10 },
  climb: { label: 'Climbing', color: '#0ea5e9', icon: '📈', progress: 25 },
  cruise: { label: 'Cruising', color: '#8b5cf6', icon: '✈️', progress: 50 },
  descent: { label: 'Descending', color: '#f59e0b', icon: '📉', progress: 75 },
  approach: { label: 'Approach', color: '#f97316', icon: '🛬', progress: 90 },
  landing: { label: 'Landing', color: '#22c55e', icon: '🛬', progress: 95 },
}

// Altitude thresholds in meters
const LOW_ALTITUDE = 1524 // ~5,000 ft
const CRUISE_ALTITUDE = 7620 // ~25,000 ft

// Speed thresholds in m/s
const TAXI_SPEED = 25 // ~50 kts
const APPROACH_SPEED = 90 // ~175 kts

function detectPhase(altitude: number | null, velocity: number | null, onGround: boolean): FlightPhase {
  if (onGround) {
    if (velocity && velocity > TAXI_SPEED) {
      return 'takeoff'
    }
    return 'ground'
  }

  const alt = altitude ?? 0
  const spd = velocity ?? 0

  // Low altitude phases
  if (alt < LOW_ALTITUDE) {
    if (spd < APPROACH_SPEED) {
      return 'approach'
    }
    // Could be climbing or descending - assume climbing if speed is higher
    return spd > 100 ? 'climb' : 'approach'
  }

  // Medium altitude - transitioning
  if (alt < CRUISE_ALTITUDE) {
    // Check speed to determine if climbing or descending
    // Higher speed typically indicates climb, lower indicates descent
    return spd > 180 ? 'climb' : 'descent'
  }

  // High altitude - cruising
  return 'cruise'
}

export function FlightPhaseIndicator({ altitude, velocity, onGround }: Props) {
  const phase = detectPhase(altitude, velocity, onGround)
  const config = PHASE_CONFIG[phase]

  // Calculate flight level for display
  const altFt = altitude ? Math.round(altitude * 3.281) : null

  return (
    <div
      style={{
        padding: 12,
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 10,
      }}
    >
      {/* Phase label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{config.icon}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: config.color,
            }}
          >
            {config.label}
          </span>
        </div>
        {!onGround && altFt && (
          <span
            style={{
              fontSize: 11,
              color: '#64748b',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            FL{Math.round(altFt / 100)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Phase markers */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
          }}
        >
          {[10, 25, 50, 75, 90].map((pos) => (
            <div
              key={pos}
              style={{
                position: 'absolute',
                left: `${pos}%`,
                width: 1,
                height: '100%',
                background: 'rgba(148, 163, 184, 0.2)',
              }}
            />
          ))}
        </div>

        {/* Progress fill */}
        <div
          style={{
            height: '100%',
            width: `${config.progress}%`,
            background: `linear-gradient(90deg, ${config.color}80, ${config.color})`,
            borderRadius: 3,
            transition: 'width 500ms ease, background 300ms ease',
          }}
        />

        {/* Aircraft position indicator */}
        <div
          style={{
            position: 'absolute',
            left: `${config.progress}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 12,
            height: 12,
            background: config.color,
            borderRadius: '50%',
            border: '2px solid rgba(15, 23, 42, 0.8)',
            boxShadow: `0 0 8px ${config.color}`,
            transition: 'left 500ms ease',
          }}
        />
      </div>

      {/* Phase labels below bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 9,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span style={{ color: phase === 'ground' || phase === 'takeoff' ? config.color : undefined }}>Depart</span>
        <span style={{ color: phase === 'climb' ? config.color : undefined }}>Climb</span>
        <span style={{ color: phase === 'cruise' ? config.color : undefined }}>Cruise</span>
        <span style={{ color: phase === 'descent' ? config.color : undefined }}>Descend</span>
        <span style={{ color: phase === 'approach' || phase === 'landing' ? config.color : undefined }}>Arrive</span>
      </div>
    </div>
  )
}
