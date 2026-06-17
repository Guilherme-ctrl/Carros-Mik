import { useEffect } from 'react'
import { GoogleMap, LoadScript, OverlayView } from '@react-google-maps/api'
import { supabase } from '../../lib/supabase'
import { CarMarker } from './CarMarker'
import { useCarLocations, type CarLocation } from './useCarLocations'
import type { Car } from '../cars/useCars'

const BLUMENAU_CENTER = { lat: -26.9194, lng: -49.0661 }
const TWO_MINUTES_MS = 2 * 60 * 1000

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  fullscreenControl: false,
  streetViewControl: false,
  backgroundColor: '#09090b',
}

interface Props {
  cars: Car[]
}

function MapContent({
  cars,
  locations,
  setLocations,
}: {
  cars: Car[]
  locations: CarLocation[]
  setLocations: React.Dispatch<React.SetStateAction<CarLocation[]>>
}) {
  // T07.11 — Realtime for car locations
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'car_locations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLocations((prev) => [
              ...prev.filter((l) => l.car_id !== payload.new.car_id),
              payload.new as CarLocation,
            ])
          } else if (payload.eventType === 'UPDATE') {
            setLocations((prev) =>
              prev.map((l) =>
                l.car_id === payload.new.car_id ? (payload.new as CarLocation) : l
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setLocations((prev) => prev.filter((l) => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [setLocations])

  const now = Date.now()

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={BLUMENAU_CENTER}
      zoom={13}
      options={MAP_OPTIONS}
    >
      {locations.map((loc) => {
        const car = cars.find((c) => c.id === loc.car_id)
        if (!car) return null
        const noSignal = now - new Date(loc.recorded_at).getTime() > TWO_MINUTES_MS
        return (
          <CarMarker key={loc.car_id} car={car} location={loc} noSignal={noSignal} />
        )
      })}
    </GoogleMap>
  )
}

export function MapPanel({ cars }: Props) {
  const { locations, setLocations, getLocations } = useCarLocations()
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  useEffect(() => {
    getLocations()
  }, [getLocations])

  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-900">
        <p className="text-zinc-500 text-sm">VITE_GOOGLE_MAPS_API_KEY não configurado.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 relative min-w-0">
      <LoadScript
        googleMapsApiKey={apiKey}
        loadingElement={
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <span className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        }
      >
        <MapContent cars={cars} locations={locations} setLocations={setLocations} />
      </LoadScript>
    </div>
  )
}
