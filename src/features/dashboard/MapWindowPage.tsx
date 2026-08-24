import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCars, type Car } from '../cars/useCars'
import { CarsStatusDropdown } from './CarsStatusDropdown'
import { MapPanel } from './MapPanel'
import { useAllRequests } from './useAllRequests'
import { useFleetQueue } from './useFleetQueue'

// Standalone, chrome-less page rendering only the live map — meant to be
// opened via window.open() as a separate popup window (see the "Abrir em
// outra tela" button on DashboardPage), so an operator can keep the
// requests/missions list on one screen and the map on another.
export function MapWindowPage() {
  const { cars, setCars, getCars } = useCars()
  const { requests, getAllRequests } = useAllRequests()
  // A window.open() popup is a separate JS realm — this page's useFleetQueue
  // store instance is NOT the same one DashboardPage's Realtime channel
  // drives (nfr-design Q1=B only covers DashboardPage's own channel). Without
  // this, CarsStatusDropdown here would fetch the queue once on mount and
  // then go stale for the life of the popup.
  const getFleetQueueOverview = useFleetQueue((s) => s.getOverview)

  useEffect(() => {
    getCars()
    getAllRequests()
  }, [getCars, getAllRequests])

  // U1: the car roster is a join (request_cars), not a requests column —
  // this page now refetches on any relevant change instead of trying to
  // patch the payload client-side (the old patch here already dropped the
  // `cars` relation on every update, per the reverse-engineering notes —
  // this fixes that pre-existing gap as a side effect, not just narrows it).
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        getAllRequests()
        getFleetQueueOverview()
      }, 150)
    }

    const requestsChannel = supabase
      .channel('map-window-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, scheduleRefetch)
      .subscribe()

    const requestCarsChannel = supabase
      .channel('map-window-request-cars')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_cars' }, scheduleRefetch)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(requestCarsChannel)
    }
  }, [getAllRequests, getFleetQueueOverview])

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
    <div className="relative flex h-screen w-screen bg-zinc-900">
      <MapPanel cars={cars} requests={requests} />
      <CarsStatusDropdown cars={cars} />
    </div>
  )
}
