import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CarStatusBadge } from '../cars/CarStatusBadge'
import type { Car } from '../cars/useCars'
import { CarQueueExpansion } from './CarQueueExpansion'
import { QueueIndicatorIcon } from './QueueIndicatorIcon'
import { useFleetQueue, type RequestPriority } from './useFleetQueue'

interface Props {
  cars: Car[]
}

// Read-only fleet status overview, collapsed by default, floating over the
// map — replaces the old dedicated "Carros" column. Assignment itself
// happens from RequestDetailSidebar, not here.
//
// US7/US8 — it now also carries each car's mission QUEUE: a stranded-car alert,
// a queue counter, and the expansion that reorders the queue by priority. The
// queue data comes from useFleetQueue, consumed internally on purpose
// (frontend-components.md) so the parent is not coupled to a new data shape.
export function CarsStatusDropdown({ cars }: Props) {
  const [open, setOpen] = useState(false)
  // Independent of `open`: which car's queue is expanded (Q2=A). One at a time.
  const [expandedCarId, setExpandedCarId] = useState<string | null>(null)
  const { queueByCarId, loading: queueLoading, error: queueError, getOverview, setPriority } = useFleetQueue()
  const availableCount = cars.filter((c) => c.operational_status === 'available').length

  // Same shape as DashboardPage's getCars()/getAllRequests() initial load. The
  // store is shared, so the reactive refresh is driven from DashboardPage's
  // existing Realtime channel (nfr-design Q1=B), not from a second channel here.
  useEffect(() => { getOverview() }, [getOverview])

  function handlePriorityChange(requestId: string, priority: RequestPriority) {
    // Pessimistic (Q2=A): setPriority resolves only after the refetch confirms
    // the new order, so there is no optimistic state to roll back on failure.
    setPriority(requestId, priority).catch(() => toast.error('Erro ao alterar prioridade'))
  }

  return (
    <div className="absolute top-14 right-3 z-10 w-64">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shadow-lg"
      >
        <span>Carros ({availableCount}/{cars.length} disponíveis)</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-1.5 max-h-80 overflow-y-auto bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-lg divide-y divide-zinc-800">
          {queueError && (
            <p className="px-3 py-2 text-xs text-red-400">Erro ao carregar filas: {queueError}</p>
          )}
          {cars.length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-4">Nenhum carro cadastrado.</p>
          ) : (
            cars.map((car) => {
              const queue = queueByCarId[car.id]
              const queueCount = queue?.queueCount ?? 0
              return (
                <div key={car.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-zinc-100 text-xs font-semibold truncate">Carro {car.number}</p>
                        {/* FR9.3 — indisponível E ainda com missões comprometidas. */}
                        {queue?.isStranded && <QueueIndicatorIcon queueCount={queueCount} />}
                      </div>
                      <p className="text-zinc-500 text-xs truncate">{car.pilot_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {queueCount > 0 && (
                        <button
                          data-testid={`queue-count-toggle-${car.id}`}
                          aria-expanded={expandedCarId === car.id}
                          onClick={() => setExpandedCarId((prev) => (prev === car.id ? null : car.id))}
                          className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                        >
                          {queueCount} na fila
                        </button>
                      )}
                      <CarStatusBadge status={car.operational_status} />
                    </div>
                  </div>

                  {expandedCarId === car.id && queue && (
                    <CarQueueExpansion
                      carId={car.id}
                      queueItems={queue.items}
                      onPriorityChange={handlePriorityChange}
                      disabled={queueLoading}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
