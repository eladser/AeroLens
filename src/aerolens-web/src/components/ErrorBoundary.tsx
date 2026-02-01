import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Here you could send to an error tracking service like Sentry
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              maxWidth: 500,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 24px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                margin: '0 0 12px',
                letterSpacing: '-0.5px',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: 14,
                color: '#94a3b8',
                margin: '0 0 24px',
                lineHeight: 1.6,
              }}
            >
              We encountered an unexpected error. Please try refreshing the page or click the button
              below to retry.
            </p>

            {this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  marginBottom: 24,
                  padding: 16,
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 8,
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#ef4444',
                    fontWeight: 500,
                  }}
                >
                  Error details
                </summary>
                <pre
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: '#94a3b8',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                  }}
                >
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '12px 24px',
                  background: '#0ea5e9',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0284c7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0ea5e9'
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(148, 163, 184, 0.1)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 8,
                  color: '#94a3b8',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)'
                  e.currentTarget.style.color = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
