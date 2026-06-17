import { useState } from 'react'
import { CarCard } from './CarCard'
import type { Car, CarOperationalStatus } from '../cars/useCars'
import type { RequestWithLeader } from './useAllRequests'

const STATUS_LABELS: Record<CarOperationalStatus, string> = {
  available:   'Disponível',
  on_mission:  'Em missão',
  offline:     'Offline',
  unavailable: 'Indisponível',
}

const ALL_STATUSES = Object.keys(STATUS_LABELS) as CarOperationalStatus[]

interface Props {
  cars: Car[]
  loading?: boolean
  selectedRequest: RequestWithLeader | null
  onInitiateAssign: (car: Car) => void
  fullWidth?: boolean
}

export function CarsPanel({ cars, loading, selectedRequest, onInitiateAssign, fullWidth }: Props) {
  const [statusFilter, setStatusFilter] = useState<CarOperationalStatus | 'all'>('all')

  const filtered =
    statusFilter === 'all' ? cars : cars.filter((c) => c.operational_status === statusFilter)

  return (
    <div className={`${fullWidth ? 'flex-1 w-full' : 'w-80 flex-shrink-0'} flex flex-col border-r border-zinc-800 overflow-hidden`}>
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-zinc-100 text-sm font-semibold">Carros ({cars.length})</span>
        <div className="flex gap-1 mt-2 flex-wrap">
          <FilterChip
            label="Todos"
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          {ALL_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={STATUS_LABELS[s]}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-10">Nenhum carro encontrado.</p>
        ) : (
          filtered.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              selectedRequest={selectedRequest}
              onInitiateAssign={onInitiateAssign}
            />
          ))
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
        active ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 p-3 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
        <div className="h-5 bg-zinc-800 rounded-full w-20 ml-auto" />
      </div>
      <div className="h-2.5 bg-zinc-800 rounded w-3/4" />
    </div>
  )
}
