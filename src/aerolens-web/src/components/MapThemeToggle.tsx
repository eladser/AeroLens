import { useState } from 'react'

export type MapTheme = 'auto' | 'light' | 'dark'

interface Props {
  theme: MapTheme
  isDay: boolean
  onChange: (theme: MapTheme) => void
}

export function MapThemeToggle({ theme, isDay, onChange }: Props) {
  const [showMenu, setShowMenu] = useState(false)

  // Determine the actual active theme (for display)
  const activeTheme = theme === 'auto' ? (isDay ? 'light' : 'dark') : theme

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          width: 40,
          height: 40,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
          e.currentTarget.style.borderColor = '#0ea5e9'
          e.currentTarget.style.color = '#0ea5e9'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)'
          e.currentTarget.style.color = '#94a3b8'
        }}
        title="Map theme"
        aria-label="Change map theme"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        {activeTheme === 'light' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setShowMenu(false)}
          />
          <div
            className="fade-in"
            role="menu"
            aria-label="Map theme options"
            style={{
              position: 'absolute',
              bottom: 48,
              right: 0,
              background: 'rgba(30, 41, 59, 0.98)',
              backdropFilter: 'blur(12px)',
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              padding: 6,
              zIndex: 1000,
              minWidth: 140,
            }}
          >
            {(['auto', 'light', 'dark'] as MapTheme[]).map(t => (
              <button
                key={t}
                onClick={() => {
                  onChange(t)
                  setShowMenu(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  background: theme === t ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: theme === t ? '#0ea5e9' : '#94a3b8',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  if (theme !== t) e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                }}
                onMouseLeave={e => {
                  if (theme !== t) e.currentTarget.style.background = 'transparent'
                }}
              >
                {t === 'auto' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 16.5z"/>
                    <path d="M12 7.5V9"/>
                    <path d="M7.5 12H9"/>
                    <path d="m8.46 8.46.7.7"/>
                  </svg>
                )}
                {t === 'light' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2"/>
                    <path d="M12 20v2"/>
                    <path d="m4.93 4.93 1.41 1.41"/>
                    <path d="m17.66 17.66 1.41 1.41"/>
                    <path d="M2 12h2"/>
                    <path d="M20 12h2"/>
                    <path d="m6.34 17.66-1.41 1.41"/>
                    <path d="m19.07 4.93-1.41 1.41"/>
                  </svg>
                )}
                {t === 'dark' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                  </svg>
                )}
                <span style={{ textTransform: 'capitalize' }}>{t}</span>
                {t === 'auto' && (
                  <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
                    {isDay ? 'day' : 'night'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
