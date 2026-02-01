import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { logAuditAction } from '../hooks/useAuditLog'
import type { User, Session } from '@supabase/supabase-js'

type OAuthProvider = 'google' | 'github'

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity
const SESSION_WARNING = 5 * 60 * 1000 // Warn 5 minutes before timeout

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_STORAGE_KEY = 'aerolens_login_attempts'

interface LoginAttemptData {
  attempts: number
  lastAttempt: number
  lockedUntil: number | null
}

function getLoginAttempts(email: string): LoginAttemptData {
  try {
    const data = localStorage.getItem(LOCKOUT_STORAGE_KEY)
    if (data) {
      const attempts = JSON.parse(data) as Record<string, LoginAttemptData>
      return attempts[email.toLowerCase()] || { attempts: 0, lastAttempt: 0, lockedUntil: null }
    }
  } catch {
    // Ignore parse errors
  }
  return { attempts: 0, lastAttempt: 0, lockedUntil: null }
}

function setLoginAttempts(email: string, data: LoginAttemptData): void {
  try {
    const existing = localStorage.getItem(LOCKOUT_STORAGE_KEY)
    const attempts = existing ? JSON.parse(existing) : {}
    attempts[email.toLowerCase()] = data
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Ignore storage errors
  }
}

function clearLoginAttempts(email: string): void {
  try {
    const existing = localStorage.getItem(LOCKOUT_STORAGE_KEY)
    if (existing) {
      const attempts = JSON.parse(existing)
      delete attempts[email.toLowerCase()]
      localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(attempts))
    }
  } catch {
    // Ignore storage errors
  }
}

function isAccountLocked(email: string): { locked: boolean; remainingTime: number } {
  const data = getLoginAttempts(email)
  if (data.lockedUntil && data.lockedUntil > Date.now()) {
    return { locked: true, remainingTime: Math.ceil((data.lockedUntil - Date.now()) / 1000 / 60) }
  }
  return { locked: false, remainingTime: 0 }
}

function recordFailedAttempt(email: string): { locked: boolean; attemptsRemaining: number; lockoutMinutes: number } {
  const data = getLoginAttempts(email)
  const now = Date.now()

  // Reset attempts if last attempt was more than lockout duration ago
  if (data.lastAttempt && now - data.lastAttempt > LOCKOUT_DURATION) {
    data.attempts = 0
    data.lockedUntil = null
  }

  data.attempts++
  data.lastAttempt = now

  if (data.attempts >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_DURATION
    setLoginAttempts(email, data)
    return { locked: true, attemptsRemaining: 0, lockoutMinutes: Math.ceil(LOCKOUT_DURATION / 1000 / 60) }
  }

  setLoginAttempts(email, data)
  return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - data.attempts, lockoutMinutes: 0 }
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  sessionWarning: boolean // True when session is about to expire
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  extendSession: () => void // Reset inactivity timer
}

const AuthContext = createContext<AuthContextType | null>(null)

// Password strength validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('At least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('One special character')
  }

  return { valid: errors.length === 0, errors }
}

// Password strength score (0-4)
export function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionWarning, setSessionWarning] = useState(false)

  // Refs for timeout management
  const timeoutRef = useRef<number | null>(null)
  const warningRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setSessionWarning(false)

    // Clear existing timers
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    if (warningRef.current) {
      window.clearTimeout(warningRef.current)
    }

    // Only set timers if user is logged in
    if (!user) return

    // Set warning timer
    warningRef.current = window.setTimeout(() => {
      setSessionWarning(true)
    }, SESSION_TIMEOUT - SESSION_WARNING)

    // Set logout timer
    timeoutRef.current = window.setTimeout(async () => {
      await supabase.auth.signOut()
    }, SESSION_TIMEOUT)
  }, [user])

  // Track user activity
  useEffect(() => {
    if (!user) return

    const handleActivity = () => {
      // Throttle activity tracking to once per second
      if (Date.now() - lastActivityRef.current > 1000) {
        resetInactivityTimer()
      }
    }

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial timer setup
    resetInactivityTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      if (warningRef.current) window.clearTimeout(warningRef.current)
    }
  }, [user, resetInactivityTimer])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Clear warning when user logs out
      if (!session) {
        setSessionWarning(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    // Check if account is locked
    const lockStatus = isAccountLocked(email)
    if (lockStatus.locked) {
      return {
        error: new Error(`Account temporarily locked. Try again in ${lockStatus.remainingTime} minute${lockStatus.remainingTime !== 1 ? 's' : ''}.`)
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Record failed attempt
      const attemptResult = recordFailedAttempt(email)
      if (attemptResult.locked) {
        return {
          error: new Error(`Too many failed attempts. Account locked for ${attemptResult.lockoutMinutes} minutes.`)
        }
      }
      // Add remaining attempts info to error message
      const originalMessage = error.message || 'Invalid login credentials'
      return {
        error: new Error(`${originalMessage}. ${attemptResult.attemptsRemaining} attempt${attemptResult.attemptsRemaining !== 1 ? 's' : ''} remaining.`)
      }
    }

    // Successful login - clear failed attempts and log
    clearLoginAttempts(email)
    resetInactivityTimer()
    logAuditAction('auth.login', { method: 'email' })
    return { error: null }
  }, [resetInactivityTimer])

  const signUp = useCallback(async (email: string, password: string) => {
    // Validate password strength before signup
    const validation = validatePassword(password)
    if (!validation.valid) {
      return {
        error: new Error(`Password requirements: ${validation.errors.join(', ')}`)
      }
    }

    const { error, data } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      logAuditAction('auth.signup', { method: 'email' }, data.user.id)
    }
    return { error }
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    })
    if (!error) {
      // Log will be recorded when auth state changes after redirect
      logAuditAction('auth.login', { method: 'oauth', provider })
    }
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    // Log before clearing user state
    if (user) {
      logAuditAction('auth.logout', {}, user.id)
    }
    // Clear timers on sign out
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    if (warningRef.current) window.clearTimeout(warningRef.current)
    setSessionWarning(false)
    await supabase.auth.signOut()
  }, [user])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (!error) {
      logAuditAction('auth.password_reset', { email_requested: true })
    }
    return { error }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    // Validate new password strength
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      return {
        error: new Error(`Password requirements: ${validation.errors.join(', ')}`)
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }, [])

  const extendSession = useCallback(() => {
    resetInactivityTimer()
  }, [resetInactivityTimer])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      sessionWarning,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      resetPassword,
      updatePassword,
      extendSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
