interface Props {
  size?: number
  showText?: boolean
}

// SVG version of the logo matching the brand design
export function Logo({ size = 40, showText = false }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#22d3ee' }} />
            <stop offset="50%" style={{ stopColor: '#0ea5e9' }} />
            <stop offset="100%" style={{ stopColor: '#8b5cf6' }} />
          </linearGradient>
        </defs>

        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#logoGrad)"
          strokeWidth="5"
        />

        {/* Inner ring */}
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke="url(#logoGrad)"
          strokeWidth="4"
          opacity="0.6"
        />

        {/* Radar sweep arc */}
        <path
          d="M50 8 A42 42 0 0 1 92 50"
          fill="none"
          stroke="url(#logoGrad)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Airplane - rotated 45 degrees */}
        <g transform="translate(50,50) rotate(-45) scale(1.8) translate(-12,-12)">
          <path
            fill="url(#logoGrad)"
            d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
          />
        </g>
      </svg>

      {showText && (
        <div>
          <div
            style={{
              fontSize: size * 0.5,
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}
          >
            AeroLens
          </div>
          <div
            style={{
              fontSize: size * 0.275,
              color: '#64748b',
              letterSpacing: '0.5px',
            }}
          >
            Real-time Flight Tracking
          </div>
        </div>
      )}
    </div>
  )
}

// Icon-only version for small contexts
export function LogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="logoIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#22d3ee' }} />
          <stop offset="50%" style={{ stopColor: '#0ea5e9' }} />
          <stop offset="100%" style={{ stopColor: '#8b5cf6' }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#logoIconGrad)" strokeWidth="5" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="url(#logoIconGrad)" strokeWidth="4" opacity="0.6" />
      <path d="M50 8 A42 42 0 0 1 92 50" fill="none" stroke="url(#logoIconGrad)" strokeWidth="7" strokeLinecap="round" />
      <g transform="translate(50,50) rotate(-45) scale(1.8) translate(-12,-12)">
        <path fill="url(#logoIconGrad)" d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </g>
    </svg>
  )
}
