import { useState, useRef, useEffect } from 'react'

interface Props {
  title: string
  content: string
  tips?: string[]
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'small' | 'medium'
}

export function ContextualHelp({
  title,
  content,
  tips,
  position = 'top',
  size = 'small',
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const iconSize = size === 'small' ? 14 : 18
  const buttonSize = size === 'small' ? 20 : 26

  const getPopoverPosition = () => {
    const base = {
      position: 'absolute' as const,
      zIndex: 100,
      width: 260,
    }

    switch (position) {
      case 'top':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 }
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 }
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 }
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 }
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Help: ${title}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        style={{
          width: buttonSize,
          height: buttonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isOpen ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          color: isOpen ? '#0ea5e9' : '#64748b',
          transition: 'all 150ms ease',
          padding: 0,
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
            e.currentTarget.style.color = '#94a3b8'
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#64748b'
          }
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-labelledby="contextual-help-title"
          style={{
            ...getPopoverPosition(),
            background: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              background: 'rgba(30, 41, 59, 0.98)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              transform: 'rotate(45deg)',
              ...(position === 'top' && {
                bottom: -6,
                left: '50%',
                marginLeft: -5,
                borderTop: 'none',
                borderLeft: 'none',
              }),
              ...(position === 'bottom' && {
                top: -6,
                left: '50%',
                marginLeft: -5,
                borderBottom: 'none',
                borderRight: 'none',
              }),
              ...(position === 'left' && {
                right: -6,
                top: '50%',
                marginTop: -5,
                borderLeft: 'none',
                borderBottom: 'none',
              }),
              ...(position === 'right' && {
                left: -6,
                top: '50%',
                marginTop: -5,
                borderRight: 'none',
                borderTop: 'none',
              }),
            }}
          />

          <div
            id="contextual-help-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(14, 165, 233, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <h4
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: '#f8fafc',
              }}
            >
              {title}
            </h4>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#94a3b8',
              lineHeight: 1.5,
            }}
          >
            {content}
          </p>

          {tips && tips.length > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 8,
                }}
              >
                Tips
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {tips.map((tip, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 12,
                      color: '#94a3b8',
                    }}
                  >
                    <span
                      style={{
                        color: '#22c55e',
                        fontWeight: 600,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      •
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Press <kbd style={{
              padding: '2px 6px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'monospace',
            }}>Esc</kbd> or click outside to close
          </div>
        </div>
      )}
    </div>
  )
}
