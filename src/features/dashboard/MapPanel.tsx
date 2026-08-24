import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, LoadScript, Polyline } from '@react-google-maps/api'
import { supabase } from '../../lib/supabase'
import { CarMarker } from './CarMarker'
import { DestinationMarker } from './DestinationMarker'
import { useCarLocations, type CarLocation } from './useCarLocations'
import type { Car } from '../cars/useCars'
import type { RequestWithLeader } from './useAllRequests'

const BLUMENAU_CENTER = { lat: -26.9194, lng: -49.0661 }
const TWO_MINUTES_MS = 2 * 60 * 1000

// U1 (ADR-3) narrowed requests.status to 5 request-level values — a mission
// with 1+ active cars is always 'car_assigned' now, regardless of any
// individual car's own progress (request_cars.status). "Active for the map"
// therefore means: has at least one assigned car and isn't closed/cancelled.

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
  requests: RequestWithLeader[]
}

function MapContent({
  cars,
  requests,
  locations,
  setLocations,
}: {
  cars: Car[]
  requests: RequestWithLeader[]
  locations: CarLocation[]
  setLocations: React.Dispatch<React.SetStateAction<CarLocation[]>>
}) {
  const geocacheRef = useRef<Record<string, { lat: number; lng: number } | null>>({})
  const [destinations, setDestinations] = useState<Record<string, { lat: number; lng: number }>>({})

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

  const activeRequests = useMemo(
    () => requests.filter((r) => r.status === 'car_assigned' && r.cars.length > 0),
    [requests]
  )

  // Posição do destino de cada solicitação ativa.
  //
  // A coordenada guardada na solicitação (20260824000006) vem da busca de
  // endereço e é usada direto: é o ponto que o líder escolheu, não uma
  // interpretação do texto. Só quem não tem cai na geocodificação do Google —
  // que é paga, assíncrona e com cache apenas em memória, refeita a cada
  // recarga de página.
  useEffect(() => {
    if (activeRequests.length === 0) return

    const semCoordenada = activeRequests.filter((req) => {
      if (req.latitude !== null && req.longitude !== null) {
        if (!(req.id in geocacheRef.current)) {
          const coords = { lat: req.latitude, lng: req.longitude }
          geocacheRef.current[req.id] = coords
          setDestinations((prev) => ({ ...prev, [req.id]: coords }))
        }
        return false
      }
      return true
    })

    if (semCoordenada.length === 0) return

    const geocoder = new window.google.maps.Geocoder()
    semCoordenada.forEach((req) => {
      if (req.id in geocacheRef.current) return
      geocacheRef.current[req.id] = null
      // A cidade vem da solicitação. Estava fixa em "Blumenau", o que colocava
      // no mapa um endereço de Gaspar na rua homônima de Blumenau.
      const address = `${req.street}, ${req.street_number}, ${req.neighborhood}, ${req.city ?? 'Blumenau'}, SC, Brasil`
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          const coords = { lat: loc.lat(), lng: loc.lng() }
          geocacheRef.current[req.id] = coords
          setDestinations((prev) => ({ ...prev, [req.id]: coords }))
        }
      })
    })
  }, [activeRequests])

  const now = Date.now()

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={BLUMENAU_CENTER}
      zoom={13}
      options={MAP_OPTIONS}
    >
      {/* Destinos e polilinhas primeiro — ficam abaixo dos marcadores de carro.
          Uma polyline por CARRO ativo na missão (era uma por missão, quando
          só existia um carro possível por missão). */}
      {activeRequests.map((req) => {
        const dest = destinations[req.id]
        if (!dest) return null
        return (
          <Fragment key={req.id}>
            <DestinationMarker request={req} position={dest} />
            {req.cars.map((ac) => {
              const carLoc = locations.find((l) => l.car_id === ac.carId)
              if (!carLoc) return null
              return (
                <Polyline
                  key={ac.carId}
                  path={[{ lat: carLoc.latitude, lng: carLoc.longitude }, dest]}
                  options={{
                    strokeColor: '#E91E8C',
                    strokeOpacity: 0.7,
                    strokeWeight: 2,
                    geodesic: true,
                  }}
                />
              )
            })}
          </Fragment>
        )
      })}

      {/* Marcadores de carro por último — ficam sempre acima dos destinos */}
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

export function MapPanel({ cars, requests }: Props) {
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
        <MapContent
          cars={cars}
          requests={requests}
          locations={locations}
          setLocations={setLocations}
        />
      </LoadScript>
    </div>
  )
}
