import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface TrackedFlight {
  id: string
  trip_id: string
  callsign: string
  added_at: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  description?: string
  is_public: boolean
  share_token: string | null
  created_at: string
  flights: TrackedFlight[]
}

export function useTrips() {
  const { user } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([])
      return
    }

    setLoading(true)
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })

    if (tripsError) {
      console.error('Failed to fetch trips:', tripsError)
      setLoading(false)
      return
    }

    const { data: flightsData, error: flightsError } = await supabase
      .from('tracked_flights')
      .select('*')

    if (flightsError) {
      console.error('Failed to fetch flights:', flightsError)
    }

    const tripsWithFlights: Trip[] = (tripsData || []).map(trip => ({
      ...trip,
      is_public: trip.is_public ?? false,
      share_token: trip.share_token ?? null,
      flights: (flightsData || []).filter(f => f.trip_id === trip.id)
    }))

    setTrips(tripsWithFlights)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  const createTrip = useCallback(async (name: string) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('trips')
      .insert({ name, user_id: user.id })

    if (!error) fetchTrips()
    return { error }
  }, [user, fetchTrips])

  const deleteTrip = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', id)

    if (!error) fetchTrips()
    return { error }
  }, [fetchTrips])

  const addFlightToTrip = useCallback(async (tripId: string, callsign: string) => {
    const { error } = await supabase
      .from('tracked_flights')
      .insert({ trip_id: tripId, callsign })

    if (!error) fetchTrips()
    return { error }
  }, [fetchTrips])

  const removeFlightFromTrip = useCallback(async (flightId: string) => {
    const { error } = await supabase
      .from('tracked_flights')
      .delete()
      .eq('id', flightId)

    if (!error) fetchTrips()
    return { error }
  }, [fetchTrips])

  const shareTrip = useCallback(async (tripId: string): Promise<{ shareUrl: string | null; error: Error | null }> => {
    // Call the database function to make trip public and get share token
    const { data, error } = await supabase
      .rpc('make_trip_public', { trip_uuid: tripId })

    if (error) {
      console.error('Failed to share trip:', error)
      return { shareUrl: null, error: new Error(error.message) }
    }

    const shareToken = data as string
    const shareUrl = `${window.location.origin}/trip/${shareToken}`

    fetchTrips()
    return { shareUrl, error: null }
  }, [fetchTrips])

  const unshareTrip = useCallback(async (tripId: string): Promise<{ error: Error | null }> => {
    // Call the database function to make trip private
    const { error } = await supabase
      .rpc('make_trip_private', { trip_uuid: tripId })

    if (error) {
      console.error('Failed to unshare trip:', error)
      return { error: new Error(error.message) }
    }

    fetchTrips()
    return { error: null }
  }, [fetchTrips])

  const getShareUrl = useCallback((trip: Trip): string | null => {
    if (!trip.is_public || !trip.share_token) return null
    return `${window.location.origin}/trip/${trip.share_token}`
  }, [])

  return {
    trips,
    loading,
    createTrip,
    deleteTrip,
    addFlightToTrip,
    removeFlightFromTrip,
    shareTrip,
    unshareTrip,
    getShareUrl,
    refresh: fetchTrips
  }
}

// Hook to fetch a shared trip by share token (for public view)
export function useSharedTrip(shareToken: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shareToken) {
      setTrip(null)
      return
    }

    async function fetchSharedTrip() {
      setLoading(true)
      setError(null)

      // Fetch the trip by share token
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single()

      if (tripError || !tripData) {
        setError('Trip not found or is no longer shared')
        setLoading(false)
        return
      }

      // Fetch flights for this trip
      const { data: flightsData, error: flightsError } = await supabase
        .from('tracked_flights')
        .select('*')
        .eq('trip_id', tripData.id)

      if (flightsError) {
        console.error('Failed to fetch flights:', flightsError)
      }

      setTrip({
        ...tripData,
        is_public: tripData.is_public ?? false,
        share_token: tripData.share_token ?? null,
        flights: flightsData || []
      })
      setLoading(false)
    }

    fetchSharedTrip()
  }, [shareToken])

  return { trip, loading, error }
}
