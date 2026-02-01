import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'system' | 'light' | 'dark' | 'high-contrast'
export type ResolvedTheme = 'light' | 'dark' | 'high-contrast'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_KEY = 'aerolens_theme'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === 'system') return getSystemTheme()
    return theme
  })

  // Update resolved theme when theme changes or system preference changes
  useEffect(() => {
    function updateResolvedTheme() {
      const resolved = theme === 'system' ? getSystemTheme() : theme
      setResolvedTheme(resolved)

      // Apply theme to document
      document.documentElement.setAttribute('data-theme', resolved)
    }

    updateResolvedTheme()

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
