interface Props {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function FollowModeButton({ enabled, onChange }: Props) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      title={enabled ? 'Stop following aircraft (F)' : 'Follow selected aircraft (F)'}
      aria-label={enabled ? 'Stop following aircraft' : 'Follow selected aircraft'}
      aria-pressed={enabled}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: enabled
          ? 'linear-gradient(135deg, #0ea5e9, #6366f1)'
          : 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        border: enabled
          ? 'none'
          : '1px solid rgba(148, 163, 184, 0.1)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: enabled
          ? '0 0 20px rgba(14, 165, 233, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'all 200ms ease',
      }}
      onMouseEnter={e => {
        if (!enabled) {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 1)'
          e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.3)'
        }
      }}
      onMouseLeave={e => {
        if (!enabled) {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
        }
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={enabled ? '#fff' : '#94a3b8'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Crosshair/target icon */}
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    </button>
  )
}
