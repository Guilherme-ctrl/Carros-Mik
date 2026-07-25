import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCars, type Car } from '../cars/useCars'
import { MapPanel } from './MapPanel'
import { useAllRequests, type RequestWithLeader } from './useAllRequests'

// Standalone, chrome-less page rendering only the live map — meant to be
// opened via window.open() as a separate popup window (see the "Abrir em
// outra tela" button on DashboardPage), so an operator can keep the
// requests/missions list on one screen and the map on another.
export function MapWindowPage() {
  const { cars, setCars, getCars } = useCars()
  const { requests, setRequests, getAllRequests } = useAllRequests()

  useEffect(() => {
    getCars()
    getAllRequests()
  }, [getCars, getAllRequests])

  // Same realtime wiring as DashboardPage, scoped to just what MapPanel needs
  useEffect(() => {
    const channel = supabase
      .channel('map-window-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            getAllRequests()
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RequestWithLeader
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
            )
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [getAllRequests, setRequests])

  useEffect(() => {
    const channel = supabase
      .channel('map-window-cars')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCars((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Car) : c))
            )
          } else if (payload.eventType === 'INSERT') {
            setCars((prev) => [...prev, payload.new as Car])
          } else if (payload.eventType === 'DELETE') {
            setCars((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [setCars])

  return (
    <div className="flex h-screen w-screen bg-zinc-900">
      <MapPanel cars={cars} requests={requests} />
    </div>
  )
}
