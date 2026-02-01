import { useAuth } from '../contexts/AuthContext'

export function SessionWarning() {
  const { sessionWarning, extendSession, signOut } = useAuth()

  if (!sessionWarning) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
    >
      <div
        className="slide-up"
        style={{
          background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
          borderRadius: 16,
          padding: 32,
          width: 380,
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
        }}
      >
        {/* Warning icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: '#f8fafc',
          }}
        >
          Session Expiring Soon
        </h2>

        <p
          style={{
            margin: '12px 0 24px',
            fontSize: 14,
            color: '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          Your session will expire due to inactivity. Would you like to stay signed in?
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={signOut}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.borderColor = '#ef4444'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            Sign Out
          </button>

          <button
            onClick={extendSession}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  )
}
