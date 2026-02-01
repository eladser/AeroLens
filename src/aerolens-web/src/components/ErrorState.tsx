interface Props {
  title?: string
  message?: string
  errorCode?: string
  onRetry?: () => void
  compact?: boolean
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; suggestion: string }> = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to reach our servers.',
    suggestion: 'Check your internet connection and try again.',
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The server took too long to respond.',
    suggestion: 'Please try again in a moment.',
  },

  // API errors
  API_UNAVAILABLE: {
    title: 'Service Unavailable',
    message: 'Our flight data service is temporarily unavailable.',
    suggestion: 'We\'re working to restore service. Try again shortly.',
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests.',
    suggestion: 'Please wait a moment before trying again.',
  },

  // Data errors
  NO_DATA: {
    title: 'No Data Available',
    message: 'Flight data is not currently available for this area.',
    suggestion: 'Try zooming out or moving to a different location.',
  },
  FLIGHT_NOT_FOUND: {
    title: 'Flight Not Found',
    message: 'This flight could not be found.',
    suggestion: 'The flight may have landed or the callsign may be incorrect.',
  },

  // Auth errors
  UNAUTHORIZED: {
    title: 'Session Expired',
    message: 'Your session has expired.',
    suggestion: 'Please sign in again to continue.',
  },
  FORBIDDEN: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this.',
    suggestion: 'Contact support if you believe this is an error.',
  },

  // Default
  UNKNOWN: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again or refresh the page.',
  },
}

function getErrorInfo(errorCode?: string, title?: string, message?: string) {
  const preset = ERROR_MESSAGES[errorCode || 'UNKNOWN'] || ERROR_MESSAGES.UNKNOWN
  return {
    title: title || preset.title,
    message: message || preset.message,
    suggestion: preset.suggestion,
  }
}

export function ErrorState({ title, message, errorCode, onRetry, compact = false }: Props) {
  const errorInfo = getErrorInfo(errorCode, title, message)

  if (compact) {
    return (
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: 'rgba(239, 68, 68, 0.15)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{errorInfo.title}</div>
          <div style={{ fontSize: 12, color: '#f87171', marginTop: 2 }}>{errorInfo.message}</div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: 6,
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>

      <h3
        style={{
          margin: '0 0 8px',
          fontSize: 16,
          fontWeight: 600,
          color: '#f8fafc',
        }}
      >
        {errorInfo.title}
      </h3>

      <p
        style={{
          margin: '0 0 8px',
          fontSize: 14,
          color: '#94a3b8',
          lineHeight: 1.5,
        }}
      >
        {errorInfo.message}
      </p>

      <p
        style={{
          margin: '0 0 20px',
          fontSize: 13,
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        {errorInfo.suggestion}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '10px 20px',
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: 8,
            color: '#0ea5e9',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 11-9-9" />
            <polyline points="21,3 21,9 15,9" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  )
}

// Export error codes for use in components
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  NO_DATA: 'NO_DATA',
  FLIGHT_NOT_FOUND: 'FLIGHT_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  UNKNOWN: 'UNKNOWN',
} as const
