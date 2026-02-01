import { useState, useEffect } from 'react'
import { LogoIcon } from './Logo'
import { FocusTrap } from './FocusTrap'

const shortcuts = [
  { keys: ['/', 'Ctrl+K'], action: 'Focus search' },
  { keys: ['↑', '↓'], action: 'Navigate search results' },
  { keys: ['Enter'], action: 'Select result' },
  { keys: ['Esc'], action: 'Close panel / Deselect' },
  { keys: ['?'], action: 'Show this help' },
]

const mapControls = [
  { keys: ['Scroll'], action: 'Zoom in/out' },
  { keys: ['+', '-'], action: 'Zoom controls' },
  { keys: ['R'], action: 'Reset map view' },
  { keys: ['Arrows'], action: 'Pan map' },
  { keys: ['Drag'], action: 'Pan map (mouse)' },
  { keys: ['Click'], action: 'Select aircraft' },
]

export function HelpButton() {
  const [open, setOpen] = useState(false)

  // Listen for ? key to open help
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setOpen(true)
        }
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      {/* Help button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open help and keyboard shortcuts"
        aria-expanded={open}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 44,
          height: 44,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: 18,
          fontWeight: 600,
          zIndex: 1000,
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
          e.currentTarget.style.color = '#64748b'
        }}
        title="Help & Keyboard Shortcuts (?)"
      >
        ?
      </button>

      {/* Help modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
          }}
          onClick={() => setOpen(false)}
        >
          <FocusTrap>
            <div
              className="slide-up"
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-modal-title"
              style={{
              background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
              borderRadius: 16,
              padding: 28,
              width: 420,
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24,
            }}>
              <div>
                <h2 id="help-modal-title" style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#f8fafc',
                  letterSpacing: '-0.5px',
                }}>
                  Keyboard Shortcuts
                </h2>
                <p style={{
                  margin: '6px 0 0',
                  fontSize: 13,
                  color: '#64748b',
                }}>
                  Quick actions to navigate AeroLens
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close help dialog"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(148, 163, 184, 0.1)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: 18,
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

            {/* Keyboard shortcuts section */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
              }}>
                Keyboard
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                      {shortcut.action}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {shortcut.keys.map((key, j) => (
                        <kbd
                          key={j}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 6,
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: '#f8fafc',
                            minWidth: 24,
                            textAlign: 'center',
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map controls section */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 12,
              }}>
                Map Controls
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mapControls.map((control, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                      {control.action}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {control.keys.map((key, j) => (
                        <kbd
                          key={j}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 6,
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: '#f8fafc',
                            minWidth: 24,
                            textAlign: 'center',
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* About section */}
            <div style={{
              padding: 16,
              background: 'rgba(14, 165, 233, 0.05)',
              border: '1px solid rgba(14, 165, 233, 0.1)',
              borderRadius: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
              }}>
                <LogoIcon size={36} />
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                    AeroLens
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Real-time Flight Tracking
                  </div>
                </div>
              </div>
              <p style={{
                margin: '0 0 12px',
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.6,
              }}>
                Track thousands of aircraft worldwide with AI-powered delay predictions,
                weather integration, and trip management.
              </p>
              <a
                href="https://ko-fi.com/eladser"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: '#ff5e5b',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#ff4542'}
                onMouseLeave={e => e.currentTarget.style.background = '#ff5e5b'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Support on Ko-fi
              </a>
            </div>
          </div>
          </FocusTrap>
        </div>
      )}
    </>
  )
}
