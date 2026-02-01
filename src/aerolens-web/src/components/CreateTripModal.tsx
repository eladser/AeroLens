import { useState } from 'react'

interface Props {
  onClose: () => void
  onCreate: (name: string) => Promise<{ error: Error | null }>
}

export function CreateTripModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    const { error } = await onCreate(name.trim())

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      onClose()
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
          padding: 28,
          width: 360,
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'rgba(14, 165, 233, 0.1)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.5px',
          }}>
            Create New Trip
          </h2>
          <p style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: '#64748b',
          }}>
            Give your trip a memorable name
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="e.g., Summer Vacation 2024"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 16px',
              marginBottom: 16,
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 10,
              fontSize: 14,
              color: '#f8fafc',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'all 150ms ease',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#0ea5e9'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.15)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: 16,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: 10,
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(148, 163, 184, 0.1)',
                color: '#94a3b8',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)'
                e.currentTarget.style.color = '#f8fafc'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: loading || !name.trim()
                  ? 'rgba(14, 165, 233, 0.3)'
                  : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() ? 0.6 : 1,
                transition: 'all 150ms ease',
                boxShadow: loading || !name.trim() ? 'none' : '0 0 20px rgba(14, 165, 233, 0.3)',
              }}
              onMouseEnter={e => {
                if (!loading && name.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(14, 165, 233, 0.5)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = loading || !name.trim() ? 'none' : '0 0 20px rgba(14, 165, 233, 0.3)'
              }}
            >
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
