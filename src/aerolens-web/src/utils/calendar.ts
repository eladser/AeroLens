import type { Trip, TrackedFlight } from '../hooks/useTrips'

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function generateUID(flightId: string): string {
  return `${flightId}@aerolens.app`
}

function createFlightEvent(flight: TrackedFlight, tripName: string): string {
  const addedDate = new Date(flight.added_at)
  const endDate = new Date(addedDate.getTime() + 4 * 60 * 60 * 1000) // 4-hour window

  const lines = [
    'BEGIN:VEVENT',
    `UID:${generateUID(flight.id)}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(addedDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(`Flight ${flight.callsign}`)}`,
    `DESCRIPTION:${escapeICalText(`Tracked flight ${flight.callsign} for trip "${tripName}"`)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ]

  return lines.join('\r\n')
}

export function generateICalForTrip(trip: Trip): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AeroLens//Flight Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(trip.name)}`,
    'X-WR-TIMEZONE:UTC',
  ]

  for (const flight of trip.flights) {
    lines.push(createFlightEvent(flight, trip.name))
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadTripCalendar(trip: Trip): void {
  const icalContent = generateICalForTrip(trip)
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${trip.name.replace(/[^a-zA-Z0-9]/g, '-')}-trip.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function getGoogleCalendarUrl(flight: TrackedFlight, tripName: string): string {
  const addedDate = new Date(flight.added_at)
  const endDate = new Date(addedDate.getTime() + 4 * 60 * 60 * 1000)

  const formatGoogleDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Flight ${flight.callsign}`,
    details: `Tracked flight ${flight.callsign} for trip "${tripName}"`,
    dates: `${formatGoogleDate(addedDate)}/${formatGoogleDate(endDate)}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function getGoogleCalendarUrlForTrip(trip: Trip): string | null {
  if (trip.flights.length === 0) return null
  // Google Calendar only supports one event via URL, use first flight
  return getGoogleCalendarUrl(trip.flights[0], trip.name)
}
