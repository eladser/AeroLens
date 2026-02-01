import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!user) return null

  const initial = user.email?.charAt(0).toUpperCase() ?? '?'
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          color: '#fff',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 150ms ease',
          boxShadow: '0 0 15px rgba(14, 165, 233, 0.3)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.5)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 0 15px rgba(14, 165, 233, 0.3)'
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 12,
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            minWidth: 220,
            overflow: 'hidden',
          }}
        >
          {/* User info header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            background: 'rgba(15, 23, 42, 0.5)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
              }}>
                {initial}
              </div>
              <div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#f8fafc',
                }}>
                  {displayName}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginTop: 2,
                }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '8px 0' }}>
            <button
              onClick={() => { signOut(); setOpen(false) }}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
