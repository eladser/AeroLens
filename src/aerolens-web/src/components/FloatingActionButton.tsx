import { useState, useEffect, useRef } from 'react'
import { useHaptic } from '../hooks/useHaptic'

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
}

interface Props {
  actions: QuickAction[]
}

export function FloatingActionButton({ actions }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const fabRef = useRef<HTMLDivElement>(null)
  const haptic = useHaptic()

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  if (!isMobile) return null

  const toggleOpen = () => {
    haptic.tap()
    setIsOpen(!isOpen)
  }

  const handleActionClick = (action: QuickAction) => {
    haptic.select()
    action.onClick()
    setIsOpen(false)
  }

  return (
    <div
      ref={fabRef}
      style={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'flex-end',
        gap: 12,
      }}
    >
      {isOpen && actions.map((action, index) => (
        <div
          key={action.id}
          className="slide-up"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: `slideUp 200ms ease-out ${index * 50}ms both`,
          }}
        >
          <span
            style={{
              padding: '8px 12px',
              background: 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(12px)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            {action.label}
          </span>

          <button
            onClick={() => handleActionClick(action)}
            aria-label={action.label}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: action.color || 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: action.color ? '#fff' : '#94a3b8',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.1)'
              if (!action.color) {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.4)'
                e.currentTarget.style.color = '#0ea5e9'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              if (!action.color) {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
                e.currentTarget.style.color = '#94a3b8'
              }
            }}
          >
            {action.icon}
          </button>
        </div>
      ))}

      <button
        onClick={toggleOpen}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isOpen}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isOpen
            ? 'rgba(239, 68, 68, 0.9)'
            : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          border: 'none',
          boxShadow: isOpen
            ? '0 4px 20px rgba(239, 68, 68, 0.4)'
            : '0 4px 20px rgba(14, 165, 233, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transition: 'all 200ms ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
