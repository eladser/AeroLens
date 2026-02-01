import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogoIcon } from './Logo'

interface Props {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  const { signIn, signUp, signInWithOAuth } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      if (mode === 'signup') {
        setError('Check your email to confirm your account')
      } else {
        onClose()
      }
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setError(null)
    setLoading(true)
    const { error } = await signInWithOAuth(provider)
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        className="slide-up"
        style={{
          background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
          borderRadius: 16,
          padding: 32,
          width: 380,
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
            <LogoIcon size={56} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#f8fafc' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }}>
            {mode === 'signin'
              ? 'Sign in to save trips and track flights'
              : 'Join AeroLens to unlock all features'}
          </p>
        </div>

        {/* OAuth Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '12px 16px',
              background: '#fff',
              color: '#1f2937',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth('github')}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '12px 16px',
              background: '#24292e',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          margin: '20px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.2)' }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.2)' }} />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: 12,
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 10,
              fontSize: 14,
              color: '#f8fafc',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)')}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: 16,
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 10,
              fontSize: 14,
              color: '#f8fafc',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)')}
          />

          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: 16,
              background: error.includes('Check your email')
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${error.includes('Check your email') ? '#22c55e' : '#ef4444'}`,
              color: error.includes('Check your email') ? '#22c55e' : '#ef4444',
              borderRadius: 10,
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: '#64748b' }}>
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
