import { CarStatusBadge } from '../cars/CarStatusBadge'
import { formatPhoneForDisplay } from '../../shared/utils/phone'
import type { Car } from '../cars/useCars'
import type { RequestWithLeader } from './useAllRequests'

interface Props {
  car: Car
  selectedRequest: RequestWithLeader | null
  onInitiateAssign: (car: Car) => void
}

export function CarCard({ car, selectedRequest, onInitiateAssign }: Props) {
  const canAssign = selectedRequest !== null && car.operational_status === 'available'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-100 text-sm font-bold">Carro {car.number}</span>
        <CarStatusBadge status={car.operational_status} />
      </div>
      <div className="space-y-0.5">
        <p className="text-zinc-300 text-xs">
          <span className="text-zinc-500">Piloto: </span>{car.pilot_name}
        </p>
        {car.copilot_name && (
          <p className="text-zinc-300 text-xs">
            <span className="text-zinc-500">Copiloto: </span>{car.copilot_name}
          </p>
        )}
        <p className="text-zinc-500 text-xs">{formatPhoneForDisplay(car.pilot_phone)}</p>
        {car.copilot_phone && (
          <p className="text-zinc-500 text-xs">{formatPhoneForDisplay(car.copilot_phone)}</p>
        )}
      </div>
      {canAssign && (
        <button
          onClick={() => onInitiateAssign(car)}
          className="w-full mt-1 text-xs py-1 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          {selectedRequest?.status === 'car_assigned' ? 'Reatribuir' : 'Atribuir'}
        </button>
      )}
    </div>
  )
}
