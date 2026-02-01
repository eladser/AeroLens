type AnalyticsEvent = {
  name: string
  props?: Record<string, string | number | boolean>
}

type AnalyticsProvider = 'plausible' | 'umami' | 'none'

const ANALYTICS_DOMAIN = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined
const ANALYTICS_PROVIDER = (import.meta.env.VITE_ANALYTICS_PROVIDER as AnalyticsProvider) || 'none'

let initialized = false

export function initAnalytics(): void {
  if (initialized || ANALYTICS_PROVIDER === 'none' || !ANALYTICS_DOMAIN) return

  if (ANALYTICS_PROVIDER === 'plausible') {
    const script = document.createElement('script')
    script.defer = true
    script.dataset.domain = ANALYTICS_DOMAIN
    script.src = 'https://plausible.io/js/script.js'
    document.head.appendChild(script)
  } else if (ANALYTICS_PROVIDER === 'umami') {
    const script = document.createElement('script')
    script.defer = true
    script.dataset.websiteId = ANALYTICS_DOMAIN
    script.src = 'https://analytics.umami.is/script.js'
    document.head.appendChild(script)
  }

  initialized = true
}

export function trackEvent(event: AnalyticsEvent): void {
  if (ANALYTICS_PROVIDER === 'none') return

  if (ANALYTICS_PROVIDER === 'plausible' && window.plausible) {
    window.plausible(event.name, { props: event.props })
  } else if (ANALYTICS_PROVIDER === 'umami' && window.umami) {
    window.umami.track(event.name, event.props)
  }
}

export function trackPageView(path?: string): void {
  if (ANALYTICS_PROVIDER === 'none') return

  if (ANALYTICS_PROVIDER === 'plausible' && window.plausible) {
    window.plausible('pageview', { u: path || window.location.pathname })
  } else if (ANALYTICS_PROVIDER === 'umami' && window.umami) {
    window.umami.track()
  }
}

export const analytics = {
  flightSearch: (query: string) => trackEvent({ name: 'flight_search', props: { query } }),
  flightSelected: (icao24: string) => trackEvent({ name: 'flight_selected', props: { icao24 } }),
  tripCreated: () => trackEvent({ name: 'trip_created' }),
  tripShared: () => trackEvent({ name: 'trip_shared' }),
  predictionRequested: () => trackEvent({ name: 'prediction_requested' }),
  signIn: (method: string) => trackEvent({ name: 'sign_in', props: { method } }),
  signUp: (method: string) => trackEvent({ name: 'sign_up', props: { method } }),
  pwaInstalled: () => trackEvent({ name: 'pwa_installed' }),
  notificationsEnabled: () => trackEvent({ name: 'notifications_enabled' }),
}

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, unknown>; u?: string }) => void
    umami?: { track: (event?: string, props?: Record<string, unknown>) => void }
  }
}
