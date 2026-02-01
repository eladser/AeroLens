import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useHaptic } from '../hooks/useHaptic'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const haptic = useHaptic()
  // Store haptic ref to avoid stale closures in useCallback
  const hapticRef = useRef(haptic)
  useEffect(() => {
    hapticRef.current = haptic
  }, [haptic])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: Toast = { id, message, type, duration }

    setToasts(prev => [...prev, toast])

    // Trigger haptic feedback based on toast type
    if (type === 'success') {
      hapticRef.current.success()
    } else if (type === 'error') {
      hapticRef.current.error()
    } else if (type === 'warning') {
      hapticRef.current.warning()
    } else {
      hapticRef.current.tap()
    }

    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 360,
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e', icon: '✓' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', icon: '✕' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', icon: '!' },
    info: { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)', text: '#0ea5e9', icon: 'ℹ' },
  }

  const color = colors[toast.type]

  return (
    <div
      className="slide-up"
      style={{
        background: 'rgba(30, 41, 59, 0.98)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${color.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: color.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color.text,
          fontWeight: 600,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {toast.type === 'success' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {toast.type === 'error' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        )}
        {toast.type === 'warning' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M12 9v4M12 17h.01" />
          </svg>
        )}
        {toast.type === 'info' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        )}
      </div>
      <span
        style={{
          flex: 1,
          color: '#f8fafc',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
          e.currentTarget.style.color = '#94a3b8'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.color = '#64748b'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
