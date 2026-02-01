import { useState } from 'react'
import { useTheme, type Theme } from '../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [spinning, setSpinning] = useState(false)

  // Cycle through themes: system -> light -> dark -> high-contrast -> system
  const cycleTheme = () => {
    // Trigger spin animation
    setSpinning(true)
    setTimeout(() => setSpinning(false), 300)

    const nextTheme: Record<Theme, Theme> = {
      system: 'light',
      light: 'dark',
      dark: 'high-contrast',
      'high-contrast': 'system',
    }
    setTheme(nextTheme[theme])
  }

  const getIcon = () => {
    if (theme === 'system') {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    }
    if (theme === 'high-contrast') {
      // High contrast icon - circle with diagonal line (contrast symbol)
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
        </svg>
      )
    }
    if (resolvedTheme === 'light') {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    )
  }

  const getLabel = () => {
    if (theme === 'system') return 'System theme'
    if (theme === 'light') return 'Light theme'
    if (theme === 'high-contrast') return 'High contrast theme'
    return 'Dark theme'
  }

  return (
    <button
      onClick={cycleTheme}
      title={getLabel()}
      aria-label={getLabel()}
      style={{
        width: 40,
        height: 40,
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 150ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--color-bg-light)'
        e.currentTarget.style.color = 'var(--color-text)'
        e.currentTarget.style.borderColor = 'var(--color-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--color-text-muted)'
        e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 300ms ease',
        transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
      }}>
        {getIcon()}
      </span>
    </button>
  )
}
