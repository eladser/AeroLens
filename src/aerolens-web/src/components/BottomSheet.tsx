import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useHaptic } from '../hooks/useHaptic'

interface Props {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  maxHeight?: number
  minHeight?: number
  title?: string
  showHeader?: boolean
  headerTitle?: string
}

const VELOCITY_THRESHOLD = 0.5 // px/ms - speed needed to dismiss
const DISMISS_THRESHOLD = 0.3 // % of height needed to dismiss

export function BottomSheet({
  children,
  isOpen,
  onClose,
  maxHeight = 90,
  minHeight = 20,
  title = 'Panel',
  showHeader = false,
  headerTitle,
}: Props) {
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragStartTranslate = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const velocity = useRef(0)
  const { select: selectHaptic, tap: tapHaptic } = useHaptic()

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        setTranslateY(0)
      })
    } else {
      setTranslateY(100)
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true)
    dragStartY.current = clientY
    dragStartTranslate.current = translateY
    lastY.current = clientY
    lastTime.current = Date.now()
    velocity.current = 0
  }, [translateY])

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return

    const deltaY = clientY - dragStartY.current
    const sheetHeight = sheetRef.current?.offsetHeight || 0
    const percentDelta = (deltaY / sheetHeight) * 100

    const now = Date.now()
    const timeDelta = now - lastTime.current
    if (timeDelta > 0) {
      velocity.current = (clientY - lastY.current) / timeDelta
    }
    lastY.current = clientY
    lastTime.current = now

    const newTranslate = Math.max(0, dragStartTranslate.current + percentDelta)
    setTranslateY(newTranslate)

    if (newTranslate > DISMISS_THRESHOLD * 100 && dragStartTranslate.current + percentDelta - 1 <= DISMISS_THRESHOLD * 100) {
      selectHaptic()
    }
  }, [isDragging, selectHaptic])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    const shouldDismiss =
      translateY > DISMISS_THRESHOLD * 100 ||
      velocity.current > VELOCITY_THRESHOLD

    if (shouldDismiss) {
      tapHaptic()
      onClose()
    } else {
      setTranslateY(0)
    }
  }, [isDragging, translateY, onClose, tapHaptic])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragStart(touch.clientY)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleDragMove(touch.clientY)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientY)

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [handleDragStart, handleDragMove, handleDragEnd])

  if (!isVisible) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1999,
          opacity: isOpen && translateY < 50 ? 1 - (translateY / 100) : 0,
          transition: isDragging ? 'none' : 'opacity 300ms ease',
        }}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: `${maxHeight}vh`,
          minHeight: `${minHeight}vh`,
          background: 'var(--color-bg-card)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)',
          zIndex: 2000,
          transform: `translateY(${translateY}%)`,
          transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          touchAction: 'none',
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            padding: '12px 16px 8px',
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: 'var(--color-text-dim)',
              borderRadius: 2,
              margin: '0 auto',
              opacity: 0.5,
            }}
            aria-hidden="true"
          />
        </div>

        {showHeader && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px 12px',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              {headerTitle || title}
            </h2>
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
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        <div
          style={{
            height: 'env(safe-area-inset-bottom, 0px)',
            flexShrink: 0,
          }}
        />
      </div>
    </>
  )
}
