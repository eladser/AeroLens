import { useState, useRef, useCallback, type RefObject } from 'react'
import { useHaptic } from './useHaptic'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  enabled?: boolean
}

interface UsePullToRefreshResult {
  containerRef: RefObject<HTMLDivElement | null>
  isRefreshing: boolean
  pullDistance: number
  pullProgress: number
  isThresholdReached: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 150,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef<number | null>(null)
  const haptic = useHaptic()
  const hasTriggeredHaptic = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return

    // Only start if scrolled to top
    const container = containerRef.current
    if (container && container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
      hasTriggeredHaptic.current = false
    }
  }, [enabled, isRefreshing])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing || startY.current === null) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) {
      startY.current = null
      setPullDistance(0)
      return
    }

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0) {
      // Apply resistance to make pull feel natural
      const resistance = 0.5
      const distance = Math.min(diff * resistance, maxPull)
      setPullDistance(distance)

      // Trigger haptic when threshold is reached
      if (distance >= threshold && !hasTriggeredHaptic.current) {
        haptic.select()
        hasTriggeredHaptic.current = true
      }

      // Prevent default scrolling when pulling down
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }, [enabled, isRefreshing, maxPull, threshold, haptic])

  const onTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing || startY.current === null) return

    startY.current = null

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold) // Keep indicator visible

      try {
        haptic.success()
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Animate back to 0
      setPullDistance(0)
    }
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh, haptic])

  const pullProgress = Math.min(pullDistance / threshold, 1)
  const isThresholdReached = pullDistance >= threshold

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress,
    isThresholdReached,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
