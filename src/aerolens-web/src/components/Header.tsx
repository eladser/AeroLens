import { useAuth } from '../contexts/AuthContext'
import { UserMenu } from './UserMenu'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Tooltip } from './Tooltip'

interface Props {
  onSignIn: () => void
  onTrips: () => void
  onNotifications: () => void
  onShortcuts?: () => void
}

export function Header({ onSignIn, onTrips, onNotifications, onShortcuts }: Props) {
  const { user, loading } = useAuth()

  return (
    <header style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'var(--color-bg-card)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      {/* Logo */}
      <Logo size={40} showText />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Keyboard Shortcuts */}
        {onShortcuts && (
          <Tooltip content="Keyboard shortcuts (?)" position="bottom">
            <button
              onClick={onShortcuts}
              aria-label="Show keyboard shortcuts"
              style={{
                width: 40,
                height: 40,
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-bg-light)'
                e.currentTarget.style.color = 'var(--color-text)'
                e.currentTarget.style.borderColor = 'var(--color-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-muted)'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8" />
              </svg>
            </button>
          </Tooltip>
        )}

        {/* Notifications */}
        <Tooltip content="Notification Settings" position="bottom">
          <button
            onClick={onNotifications}
            aria-label="Open notification settings"
            style={{
              width: 40,
              height: 40,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-bg-light)'
              e.currentTarget.style.color = 'var(--color-text)'
              e.currentTarget.style.borderColor = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.borderColor = 'var(--color-border)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </Tooltip>

        {!loading && user && (
          <Tooltip content="View and manage saved trips" position="bottom">
            <button
              onClick={onTrips}
              aria-label="Open my trips"
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-bg-light)'
                e.currentTarget.style.color = 'var(--color-text)'
                e.currentTarget.style.borderColor = 'var(--color-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-muted)'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              My Trips
            </button>
          </Tooltip>
        )}

        {!loading && (
          user ? (
            <UserMenu />
          ) : (
            <Tooltip content="Sign in to save trips and preferences" position="bottom">
              <button
                onClick={onSignIn}
                aria-label="Sign in to your account"
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(14, 165, 233, 0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.2)'
                }}
              >
                Sign In
              </button>
            </Tooltip>
          )
        )}
      </div>
    </header>
  )
}
