import { useState, useRef, useEffect, type ReactNode } from 'react'

interface Props {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, position = 'top', delay = 150 }: Props) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function handleMouseEnter() {
    timeoutRef.current = window.setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        let x = rect.left + rect.width / 2
        let y = rect.top

        switch (position) {
          case 'bottom':
            y = rect.bottom + 8
            break
          case 'left':
            x = rect.left - 8
            y = rect.top + rect.height / 2
            break
          case 'right':
            x = rect.right + 8
            y = rect.top + rect.height / 2
            break
          default: // top
            y = rect.top - 8
        }

        setCoords({ x, y })
        setVisible(true)
      }
    }, delay)
  }

  function handleMouseLeave() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setVisible(false)
  }

  const getTransform = () => {
    switch (position) {
      case 'bottom':
        return 'translateX(-50%)'
      case 'left':
        return 'translate(-100%, -50%)'
      case 'right':
        return 'translateY(-50%)'
      default: // top
        return 'translate(-50%, -100%)'
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform: getTransform(),
            padding: '6px 10px',
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#e2e8f0',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            animation: 'fadeIn 150ms ease',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
