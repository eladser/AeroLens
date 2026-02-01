import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  active?: boolean
  restoreFocus?: boolean
}

export function FocusTrap({ children, active = true, restoreFocus = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      if (!containerRef.current) return []
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        )
      ).filter(el => el.offsetParent !== null) // Only visible elements
    }

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Prefer to focus a close button or the first focusable element
      const closeButton = focusableElements.find(
        el => el.getAttribute('aria-label')?.toLowerCase().includes('close')
      )
      const elementToFocus = closeButton || focusableElements[0]
      setTimeout(() => elementToFocus.focus(), 0)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab on first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
        return
      }

      // Tab on last element -> go to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [active, restoreFocus])

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}
