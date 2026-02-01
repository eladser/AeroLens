import { useEffect } from 'react'
import { FocusTrap } from './FocusTrap'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: { key: string; description: string }[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { key: '/', description: 'Focus search' },
      { key: 'Ctrl + K', description: 'Focus search (alternative)' },
      { key: 'Esc', description: 'Close panel / Deselect aircraft' },
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: 'T', description: 'Cycle through themes' },
    ],
  },
  {
    title: 'Map Navigation',
    shortcuts: [
      { key: '+ / =', description: 'Zoom in' },
      { key: '- / _', description: 'Zoom out' },
      { key: 'Arrow keys', description: 'Pan map' },
      { key: 'R', description: 'Reset to default view' },
      { key: 'L', description: 'Center on your location' },
      { key: 'M', description: 'Toggle measurement mode' },
      { key: 'G', description: 'Toggle aircraft filter panel' },
      { key: 'N', description: 'Toggle mini-map' },
    ],
  },
  {
    title: 'Flight Tracking',
    shortcuts: [
      { key: 'F', description: 'Toggle follow mode (when aircraft selected)' },
      { key: 'C', description: 'Center on selected aircraft' },
    ],
  },
  {
    title: 'Tutorial',
    shortcuts: [
      { key: '→ / Enter', description: 'Next step' },
      { key: '←', description: 'Previous step' },
      { key: 'Esc', description: 'Skip tutorial' },
    ],
  },
]

export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <FocusTrap>
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="slide-up"
          style={{
            background: 'var(--color-bg-card)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            border: '1px solid var(--color-border-light)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            width: 'min(480px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 64px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8" />
                </svg>
              </div>
              <div>
                <h2 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  margin: 0,
                }}>
                  Keyboard Shortcuts
                </h2>
                <p style={{
                  fontSize: 12,
                  color: 'var(--color-text-dim)',
                  margin: 0,
                  marginTop: 2,
                }}>
                  Quick actions for power users
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-light)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                transition: 'all 150ms ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortcuts list */}
          <div
            style={{
              padding: '16px 24px 24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 10,
                  }}
                >
                  {group.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {shortcut.description}
                      </span>
                      <kbd
                        style={{
                          padding: '4px 8px',
                          background: 'var(--color-bg-light)',
                          border: '1px solid var(--color-border-light)',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--color-border-light)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
              Press <kbd style={{
                padding: '2px 6px',
                background: 'var(--color-bg-light)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
              }}>?</kbd> anytime to show this panel
            </span>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
