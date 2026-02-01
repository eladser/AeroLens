import { useState, useEffect } from 'react'
import { Logo } from './Logo'
import { FocusTrap } from './FocusTrap'
import { InteractiveTutorial } from './InteractiveTutorial'

interface Props {
  onDismiss: () => void
}

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
      </svg>
    ),
    title: 'Live Flight Tracking',
    description: 'See thousands of aircraft in real-time on an interactive map',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    title: 'Search Flights',
    description: 'Find any flight by callsign or ICAO24 transponder code',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
        <path d="M20 12a8 8 0 1 0-8 8"/>
      </svg>
    ),
    title: 'AI Delay Predictions',
    description: 'Get AI-powered delay risk analysis based on weather and flight data',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    title: 'Save Your Trips',
    description: 'Sign in to save flights and create personal trip collections',
  },
]

export function WelcomeOverlay({ onDismiss }: Props) {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Show interactive tutorial if selected
  if (showTutorial) {
    return <InteractiveTutorial onComplete={onDismiss} />
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
    >
      <FocusTrap>
        <div
          className="slide-up"
          style={{
            textAlign: 'center',
            maxWidth: 480,
            padding: 40,
          }}
        >
          {/* Logo */}
        <div style={{ margin: '0 auto 24px' }}>
          <Logo size={80} />
        </div>

        <h1 id="welcome-title" style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: 8,
          letterSpacing: '-1px',
        }}>
          Welcome to AeroLens
        </h1>
        <p style={{
          fontSize: 16,
          color: '#94a3b8',
          marginBottom: 40,
        }}>
          Track flights in real-time around the world
        </p>

        {/* Feature carousel */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          minHeight: 140,
        }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'rgba(14, 165, 233, 0.1)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#0ea5e9',
          }}>
            {features[currentFeature].icon}
          </div>
          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#f8fafc',
            marginBottom: 8,
          }}>
            {features[currentFeature].title}
          </h3>
          <p style={{
            fontSize: 14,
            color: '#94a3b8',
            margin: 0,
          }}>
            {features[currentFeature].description}
          </p>
        </div>

        {/* Feature indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 32,
        }}>
          {features.map((feature, i) => (
            <button
              key={i}
              onClick={() => setCurrentFeature(i)}
              aria-label={`Go to feature ${i + 1}: ${feature.title}`}
              aria-current={i === currentFeature ? 'true' : undefined}
              style={{
                width: i === currentFeature ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === currentFeature ? '#0ea5e9' : 'rgba(148, 163, 184, 0.3)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setShowTutorial(true)}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              boxShadow: '0 0 30px rgba(14, 165, 233, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(14, 165, 233, 0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(14, 165, 233, 0.3)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
            Take a Quick Tour
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.4)'
              e.currentTarget.style.color = '#f8fafc'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            Skip and Explore
          </button>
        </div>

          <p style={{
            fontSize: 12,
            color: '#64748b',
            marginTop: 16,
          }}>
            Press Escape or click the button to continue
          </p>
        </div>
      </FocusTrap>
    </div>
  )
}
