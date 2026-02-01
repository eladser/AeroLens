import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'aerolens_install_dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10)
      if (elapsed < DISMISS_DURATION) {
        return // Still within dismiss period
      }
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after a delay to not interrupt initial experience
      setTimeout(() => setShowPrompt(true), 30000) // 30 seconds
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
  }

  if (!showPrompt || !deferredPrompt) return null

  return (
    <div
      className="slide-up"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(to right, rgba(14, 165, 233, 0.95), rgba(99, 102, 241, 0.95))',
        backdropFilter: 'blur(12px)',
        padding: '16px 20px',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            marginBottom: 2,
          }}
        >
          Install AeroLens
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          Add to home screen for quick access
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px 14px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          }}
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          style={{
            padding: '8px 16px',
            background: 'white',
            border: 'none',
            borderRadius: 8,
            color: '#0f172a',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          Install
        </button>
      </div>
    </div>
  )
}
