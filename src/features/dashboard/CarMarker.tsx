import { OverlayView } from '@react-google-maps/api'
import type { Car } from '../cars/useCars'
import type { CarLocation } from './useCarLocations'

const STATUS_COLOR: Record<string, string> = {
  available:   '#22c55e',
  on_mission:  '#a855f7',
  offline:     '#71717a',
  unavailable: '#ef4444',
}

const STATUS_LABEL: Record<string, string> = {
  available:   'Disponível',
  on_mission:  'Em missão',
  offline:     'Offline',
  unavailable: 'Indisponível',
}

interface Props {
  car: Car
  location: CarLocation
  noSignal: boolean
}

function getPixelOffset(w: number, h: number) {
  return { x: -(w / 2), y: -(h / 2) }
}

function formatGMT3(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CarMarker({ car, location, noSignal }: Props) {
  const color = noSignal ? '#52525b' : (STATUS_COLOR[car.operational_status] ?? '#71717a')

  const titleParts = [
    `Carro ${car.number}`,
    STATUS_LABEL[car.operational_status] ?? car.operational_status,
    `Atualizado: ${formatGMT3(location.recorded_at)}`,
  ]
  if (noSignal) titleParts.push('SEM SINAL GPS')
  const title = titleParts.join(' · ')

  return (
    <OverlayView
      position={{ lat: location.latitude, lng: location.longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={getPixelOffset}
    >
      <div
        style={{ backgroundColor: color }}
        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-lg select-none relative"
        title={title}
      >
        <span className="text-white text-[10px] font-bold leading-none">{car.number}</span>
        {noSignal && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-zinc-400 border border-zinc-900"
            aria-label="Sem sinal GPS"
          />
        )}
      </div>
    </OverlayView>
  )
}
