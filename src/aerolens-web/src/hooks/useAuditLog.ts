import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'trip.create'
  | 'trip.update'
  | 'trip.delete'
  | 'trip.share'
  | 'flight.track'
  | 'flight.untrack'
  | 'flight.search'
  | 'alert.create'
  | 'alert.update'
  | 'alert.delete'
  | 'settings.update'
  | 'export.calendar'

interface AuditLogEntry {
  action: AuditAction
  details?: Record<string, unknown>
  timestamp: string
  userId?: string
  sessionId: string
  userAgent: string
  ipAddress?: string
}

const LOCAL_STORAGE_KEY = 'aerolens_audit_log'
const MAX_LOCAL_ENTRIES = 100
const SESSION_ID_KEY = 'aerolens_session_id'

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

function storeLocalEntry(entry: AuditLogEntry): void {
  try {
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY)
    const entries: AuditLogEntry[] = existing ? JSON.parse(existing) : []

    entries.push(entry)

    if (entries.length > MAX_LOCAL_ENTRIES) {
      entries.splice(0, entries.length - MAX_LOCAL_ENTRIES)
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage errors
  }
}

async function storeSupabaseEntry(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action: entry.action,
      details: entry.details || {},
      user_id: entry.userId,
      session_id: entry.sessionId,
      user_agent: entry.userAgent,
      created_at: entry.timestamp,
    })

    return !error
  } catch {
    return false
  }
}

export function useAuditLog() {
  const { user } = useAuth()

  const logAction = useCallback(
    async (action: AuditAction, details?: Record<string, unknown>) => {
      const entry: AuditLogEntry = {
        action,
        details,
        timestamp: new Date().toISOString(),
        userId: user?.id,
        sessionId: getSessionId(),
        userAgent: navigator.userAgent,
      }

      storeLocalEntry(entry)

      if (user) {
        await storeSupabaseEntry(entry)
      }
    },
    [user]
  )

  const getLocalLogs = useCallback((): AuditLogEntry[] => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }, [])

  const clearLocalLogs = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }, [])

  return {
    logAction,
    getLocalLogs,
    clearLocalLogs,
  }
}

export function logAuditAction(
  action: AuditAction,
  details?: Record<string, unknown>,
  userId?: string
): void {
  const entry: AuditLogEntry = {
    action,
    details,
    timestamp: new Date().toISOString(),
    userId,
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
  }

  storeLocalEntry(entry)

  if (userId) {
    storeSupabaseEntry(entry).catch(() => {})
  }
}
