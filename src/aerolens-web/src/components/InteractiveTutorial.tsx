import { useState, useEffect, useCallback, useRef } from 'react'
import { useHaptic } from '../hooks/useHaptic'

interface TutorialStep {
  id: string
  target?: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  actionText?: string
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AeroLens',
    description: 'Track live aircraft around the world in real-time. Let us show you around!',
    position: 'center',
  },
  {
    id: 'map',
    target: '#main-content',
    title: 'Live Flight Map',
    description: 'This map shows aircraft currently in flight. Tap any plane to see its details.',
    position: 'center',
  },
  {
    id: 'search',
    target: 'input[placeholder*="Search"]',
    title: 'Search Flights',
    description: 'Search by flight number, callsign, or airline. Try typing "UA" for United flights.',
    position: 'bottom',
  },
  {
    id: 'theme',
    target: '[aria-label*="theme"]',
    title: 'Theme Options',
    description: 'Switch between light, dark, and high-contrast themes for comfortable viewing.',
    position: 'bottom',
  },
  {
    id: 'trips',
    target: '[aria-label="My trips"]',
    title: 'Track Your Trips',
    description: 'Sign in to save flights to trips, get notifications, and share your journeys.',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start exploring flights around the world. Tap any aircraft on the map to begin.',
    position: 'center',
    actionText: 'Start Exploring',
  },
]

interface Props {
  onComplete: () => void
  startFromBeginning?: boolean
}

export function InteractiveTutorial({ onComplete, startFromBeginning = true }: Props) {
  const [currentStep, setCurrentStep] = useState(startFromBeginning ? 0 : TUTORIAL_STEPS.length - 1)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { tap, success } = useHaptic()

  const step = TUTORIAL_STEPS[currentStep]
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const isFirstStep = currentStep === 0

  useEffect(() => {
    if (!step.target) {
      setTargetRect(null)
      return
    }

    const findTarget = () => {
      const element = document.querySelector(step.target!)
      if (element) {
        setTargetRect(element.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }

    findTarget()

    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', findTarget, true)

    return () => {
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', findTarget, true)
    }
  }, [step.target])

  const goToStep = useCallback((index: number) => {
    setIsAnimating(true)
    tap()
    setTimeout(() => {
      setCurrentStep(index)
      setIsAnimating(false)
    }, 150)
  }, [tap])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      success()
      onComplete()
    } else {
      goToStep(currentStep + 1)
    }
  }, [isLastStep, onComplete, currentStep, goToStep, success])

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1)
    }
  }, [isFirstStep, currentStep, goToStep])

  const handleSkip = useCallback(() => {
    tap()
    onComplete()
  }, [onComplete, tap])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleSkip()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSkip, handleNext, handleBack])

  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 20
    const tooltipWidth = 320

    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tooltipWidth,
      }
    }

    const base: React.CSSProperties = {
      position: 'fixed',
      width: tooltipWidth,
    }

    switch (step.position) {
      case 'top':
        return {
          ...base,
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        }
      case 'bottom':
        return {
          ...base,
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        }
      case 'left':
        return {
          ...base,
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + padding,
          transform: 'translateY(-50%)',
        }
      case 'right':
        return {
          ...base,
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: 'translateY(-50%)',
        }
      default:
        return base
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: '2px solid var(--color-primary)',
            borderRadius: 12,
            boxShadow: '0 0 0 4px rgba(14, 165, 233, 0.3)',
            pointerEvents: 'none',
            animation: 'pulse-ring 2s ease-in-out infinite',
          }}
        />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={step.title}
        style={{
          ...getTooltipStyle(),
          background: 'var(--color-bg-card)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          padding: 24,
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? 'scale(0.95)' : getTooltipStyle().transform || 'none',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              aria-label={`Go to step ${index + 1}`}
              style={{
                width: index === currentStep ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: index === currentStep
                  ? 'var(--color-primary)'
                  : index < currentStep
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                opacity: index <= currentStep ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--color-text)',
          }}
        >
          {step.title}
        </h3>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 14,
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
          }}
        >
          {step.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={handleSkip}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--color-text-dim)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Skip
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirstStep && (
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 16px',
                  background: 'var(--color-bg-light)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
              }}
            >
              {step.actionText || (isLastStep ? 'Finish' : 'Next')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(14, 165, 233, 0.1);
          }
        }
      `}</style>
    </div>
  )
}
