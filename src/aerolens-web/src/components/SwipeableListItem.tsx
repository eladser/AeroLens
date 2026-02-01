import { useState, useRef, useCallback, type ReactNode, type CSSProperties } from 'react'
import { useHaptic } from '../hooks/useHaptic'

export interface SwipeAction {
  id: string
  label: string
  icon: ReactNode
  color: string
  onAction: () => void
}

interface Props {
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  actionWidth?: number
  enabled?: boolean
  style?: CSSProperties
}

const SWIPE_THRESHOLD = 0.3
const VELOCITY_THRESHOLD = 0.3

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  actionWidth = 72,
  enabled = true,
  style,
}: Props) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startTranslate = useRef(0)
  const lastX = useRef(0)
  const lastTime = useRef(0)
  const velocity = useRef(0)
  const { select: selectHaptic, tap: tapHaptic } = useHaptic()

  const leftActionsWidth = leftActions.length * actionWidth
  const rightActionsWidth = rightActions.length * actionWidth

  const handleDragStart = useCallback((clientX: number) => {
    if (!enabled) return
    setIsDragging(true)
    startX.current = clientX
    startTranslate.current = translateX
    lastX.current = clientX
    lastTime.current = Date.now()
    velocity.current = 0
  }, [enabled, translateX])

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !enabled) return

    const deltaX = clientX - startX.current

    const now = Date.now()
    const timeDelta = now - lastTime.current
    if (timeDelta > 0) {
      velocity.current = (clientX - lastX.current) / timeDelta
    }
    lastX.current = clientX
    lastTime.current = now

    let newTranslate = startTranslate.current + deltaX

    if (newTranslate > rightActionsWidth) {
      const excess = newTranslate - rightActionsWidth
      newTranslate = rightActionsWidth + excess * 0.2
    } else if (newTranslate < -leftActionsWidth) {
      const excess = -leftActionsWidth - newTranslate
      newTranslate = -leftActionsWidth - excess * 0.2
    }

    const leftThreshold = -leftActionsWidth * SWIPE_THRESHOLD
    const rightThreshold = rightActionsWidth * SWIPE_THRESHOLD

    if (
      (translateX > leftThreshold && newTranslate <= leftThreshold) ||
      (translateX < rightThreshold && newTranslate >= rightThreshold)
    ) {
      selectHaptic()
    }

    setTranslateX(newTranslate)
  }, [isDragging, enabled, translateX, leftActionsWidth, rightActionsWidth, selectHaptic])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    const shouldOpenLeft =
      (translateX < -leftActionsWidth * SWIPE_THRESHOLD) ||
      (velocity.current < -VELOCITY_THRESHOLD && translateX < 0)

    const shouldOpenRight =
      (translateX > rightActionsWidth * SWIPE_THRESHOLD) ||
      (velocity.current > VELOCITY_THRESHOLD && translateX > 0)

    if (shouldOpenLeft && leftActions.length > 0) {
      setTranslateX(-leftActionsWidth)
      tapHaptic()
    } else if (shouldOpenRight && rightActions.length > 0) {
      setTranslateX(rightActionsWidth)
      tapHaptic()
    } else {
      setTranslateX(0)
    }
  }, [isDragging, translateX, leftActionsWidth, rightActionsWidth, leftActions.length, rightActions.length, tapHaptic])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientX)

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX)
    }

    const handleMouseUp = () => {
      handleDragEnd()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [handleDragStart, handleDragMove, handleDragEnd])

  const handleActionClick = useCallback((action: SwipeAction) => {
    tapHaptic()
    setTranslateX(0)
    action.onAction()
  }, [tapHaptic])

  const handleContentClick = useCallback(() => {
    if (translateX !== 0) {
      setTranslateX(0)
    }
  }, [translateX])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {rightActions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            display: 'flex',
            transform: `translateX(${Math.min(0, translateX - rightActionsWidth)}px)`,
            transition: isDragging ? 'none' : 'transform 200ms ease-out',
          }}
        >
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
              style={{
                width: actionWidth,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: action.color,
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                padding: 8,
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {leftActions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            transform: `translateX(${Math.max(0, translateX + leftActionsWidth)}px)`,
            transition: isDragging ? 'none' : 'transform 200ms ease-out',
          }}
        >
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
              style={{
                width: actionWidth,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: action.color,
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                padding: 8,
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      <div
        onClick={handleContentClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
          background: 'var(--color-bg-card)',
          touchAction: translateX !== 0 ? 'none' : 'pan-y',
          cursor: enabled ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
