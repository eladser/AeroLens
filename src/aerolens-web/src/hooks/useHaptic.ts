type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 100, 50],
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

export function useHaptic() {
  function haptic(pattern: HapticPattern = 'light') {
    if (!canVibrate()) return
    try {
      navigator.vibrate(patterns[pattern])
    } catch {
      // Vibration blocked or unavailable
    }
  }

  return {
    haptic,
    tap: () => haptic('light'),
    select: () => haptic('medium'),
    impact: () => haptic('heavy'),
    success: () => haptic('success'),
    warning: () => haptic('warning'),
    error: () => haptic('error'),
    isSupported: canVibrate(),
  }
}
