import { useEffect, useRef, useState, useCallback } from 'react'
import { HubConnectionBuilder, HubConnection, HubConnectionState } from '@microsoft/signalr'
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack'
import type { Aircraft, AircraftResponse } from '../types/aircraft'
import { API_URL, getAircraft } from '../lib/api'

interface UseAircraftSignalRResult {
  aircraft: Aircraft[]
  count: number
  timestamp: Date | null
  connected: boolean
  loading: boolean
  subscribeToFlight: (icao24: string) => Promise<void>
  unsubscribeFromFlight: (icao24: string) => Promise<void>
}

export function useAircraftSignalR(): UseAircraftSignalRResult {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [count, setCount] = useState(0)
  const [timestamp, setTimestamp] = useState<Date | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const connectionRef = useRef<HubConnection | null>(null)

  const handleUpdate = useCallback((data: AircraftResponse) => {
    setAircraft(data.aircraft)
    setCount(data.count)
    setTimestamp(new Date(data.timestamp))
    setLoading(false)
  }, [])

  const subscribeToFlight = useCallback(async (icao24: string) => {
    const connection = connectionRef.current
    if (connection?.state === HubConnectionState.Connected) {
      try {
        await connection.invoke('SubscribeToFlight', icao24)
      } catch (err) {
        console.error('Failed to subscribe to flight:', err)
      }
    }
  }, [])

  const unsubscribeFromFlight = useCallback(async (icao24: string) => {
    const connection = connectionRef.current
    if (connection?.state === HubConnectionState.Connected) {
      try {
        await connection.invoke('UnsubscribeFromFlight', icao24)
      } catch (err) {
        console.error('Failed to unsubscribe from flight:', err)
      }
    }
  }, [])

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/aircraft`)
      .withHubProtocol(new MessagePackHubProtocol()) // Smaller payloads, faster serialization
      .withAutomaticReconnect()
      .build()

    connectionRef.current = connection

    connection.on('AircraftUpdate', handleUpdate)

    connection.onreconnecting(() => setConnected(false))
    connection.onreconnected(() => setConnected(true))
    connection.onclose(() => setConnected(false))

    async function start() {
      try {
        await connection.start()
        setConnected(true)
      } catch (err) {
        console.error('SignalR connection failed:', err)
        // Fall back to initial fetch
        fetchInitial()
      }
    }

    async function fetchInitial() {
      try {
        const data = await getAircraft()
        handleUpdate(data as AircraftResponse)
      } catch (err) {
        console.error('Initial fetch failed:', err)
      }
    }

    start()

    return () => {
      if (connection.state === HubConnectionState.Connected) {
        connection.stop()
      }
    }
  }, [handleUpdate])

  return { aircraft, count, timestamp, connected, loading, subscribeToFlight, unsubscribeFromFlight }
}
