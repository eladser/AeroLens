import { useEffect, useRef, type ReactNode } from 'react'
import { useHaptic } from '../hooks/useHaptic'

export interface ContextMenuItem {
  id: string
  label: string
  icon: ReactNode
  onAction: () => void
  destructive?: boolean
  disabled?: boolean
}

interface Props {
  items: ContextMenuItem[]
  x: number
  y: number
  onClose: () => void
  title?: string
}

export function ContextMenu({ items, x, y, onClose, title }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { tap } = useHaptic()

  useEffect(() => {
    if (!menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const padding = 16

    if (rect.right > window.innerWidth - padding) {
      menu.style.left = `${window.innerWidth - rect.width - padding}px`
    }
    if (rect.left < padding) {
      menu.style.left = `${padding}px`
    }

    if (rect.bottom > window.innerHeight - padding) {
      menu.style.top = `${y - rect.height}px`
    }
  }, [x, y])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside as unknown as EventListener)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside as unknown as EventListener)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return
    tap()
    item.onAction()
    onClose()
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 2999,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={menuRef}
        role="menu"
        aria-label={title || 'Context menu'}
        style={{
          position: 'fixed',
          top: y,
          left: x,
          minWidth: 180,
          maxWidth: 280,
          background: 'var(--color-bg-card)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 3000,
          overflow: 'hidden',
          animation: 'scaleIn 150ms ease-out',
        }}
      >
        {title && (
          <div
            style={{
              padding: '12px 16px 8px',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </div>
          </div>
        )}

        <div style={{ padding: '6px 0' }}>
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.destructive
                  ? '#ef4444'
                  : item.disabled
                    ? 'var(--color-text-dim)'
                    : 'var(--color-text)',
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'left',
                opacity: item.disabled ? 0.5 : 1,
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  e.currentTarget.style.background = item.destructive
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'var(--color-bg-light)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  )
}
