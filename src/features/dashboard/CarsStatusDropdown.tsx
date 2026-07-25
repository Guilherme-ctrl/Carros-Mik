import { useState } from 'react'
import { CarStatusBadge } from '../cars/CarStatusBadge'
import type { Car } from '../cars/useCars'

interface Props {
  cars: Car[]
}

// Read-only fleet status overview, collapsed by default, floating over the
// map — replaces the old dedicated "Carros" column. Assignment itself
// happens from RequestDetailSidebar, not here.
export function CarsStatusDropdown({ cars }: Props) {
  const [open, setOpen] = useState(false)
  const availableCount = cars.filter((c) => c.operational_status === 'available').length

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
          {cars.length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-4">Nenhum carro cadastrado.</p>
          ) : (
            cars.map((car) => (
              <div key={car.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-zinc-100 text-xs font-semibold truncate">Carro {car.number}</p>
                  <p className="text-zinc-500 text-xs truncate">{car.pilot_name}</p>
                </div>
                <CarStatusBadge status={car.operational_status} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
