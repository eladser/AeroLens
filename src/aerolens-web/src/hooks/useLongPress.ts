import { useCallback, useRef } from 'react'
import { useHaptic } from './useHaptic'

interface UseLongPressOptions {
  delay?: number
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void
  preventDefault?: boolean
  moveThreshold?: number
}

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
  onMouseLeave: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function useLongPress({
  delay = 500,
  onLongPress,
  onClick,
  preventDefault = true,
  moveThreshold = 10,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const { impact } = useHaptic()

  const start = useCallback((x: number, y: number) => {
    isLongPressRef.current = false
    startPosRef.current = { x, y }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      impact() // Haptic feedback on long press
    }, delay)
  }, [delay, impact])

  const move = useCallback((x: number, y: number) => {
    if (!timerRef.current) return

    const dx = Math.abs(x - startPosRef.current.x)
    const dy = Math.abs(y - startPosRef.current.y)

    if (dx > moveThreshold || dy > moveThreshold) {
      // Cancel if moved too much
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [moveThreshold])

  const end = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isLongPressRef.current) {
      if (preventDefault) {
        event.preventDefault()
      }
      onLongPress(event)
    } else if (onClick) {
      onClick(event)
    }

    isLongPressRef.current = false
  }, [onLongPress, onClick, preventDefault])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    isLongPressRef.current = false
  }, [])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    start(touch.clientX, touch.clientY)
  }, [start])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    move(touch.clientX, touch.clientY)
  }, [move])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    end(e)
  }, [end])

  // Mouse handlers (for desktop testing)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click
    start(e.clientX, e.clientY)
  }, [start])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    move(e.clientX, e.clientY)
  }, [move])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    end(e)
  }, [end])

  const onMouseLeave = useCallback(() => {
    cancel()
  }, [cancel])

  // Prevent default context menu on long press
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }
  }, [preventDefault])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onContextMenu,
  }
}
