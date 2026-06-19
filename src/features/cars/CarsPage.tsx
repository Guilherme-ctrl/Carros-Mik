import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../shared/components/ui/Button'
import { CarFormModal } from './CarFormModal'
import { CarStatusBadge } from './CarStatusBadge'
import { useCars, type Car, type CarOperationalStatus, type DriverUser } from './useCars'
import { formatPhoneForDisplay } from '../../shared/utils/phone'

const STATUS_OPTIONS: { value: CarOperationalStatus; label: string }[] = [
  { value: 'available',   label: 'Disponível' },
  { value: 'on_mission',  label: 'Em missão' },
  { value: 'offline',     label: 'Offline' },
  { value: 'unavailable', label: 'Indisponível' },
]

interface StatusSelectorProps {
  car: Car
  onUpdate: (id: string, status: CarOperationalStatus) => Promise<void>
}

function StatusSelector({ car, onUpdate }: StatusSelectorProps) {
  const [loading, setLoading] = useState(false)

  async function handleChange(value: string) {
    setLoading(true)
    try {
      await onUpdate(car.id, value as CarOperationalStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={car.operational_status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="h-7 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export function CarsPage() {
  const { cars, setCars, loading, error, getCars, createCar, updateCar, updateStatus, getDriverUsers } = useCars()

  const [showCreate, setShowCreate] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)
  const [driverUsers, setDriverUsers] = useState<DriverUser[]>([])
  const [actionError, setActionError] = useState('')
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    getCars()
    getDriverUsers().then(setDriverUsers).catch(() => {})
  }, [getCars, getDriverUsers])

  useEffect(() => {
    const channel = supabase
      .channel('cars-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCars((prev) => [...prev, payload.new as Car].sort((a, b) => a.number.localeCompare(b.number)))
          } else if (payload.eventType === 'UPDATE') {
            setCars((prev) => prev.map((c) => c.id === payload.new.id ? (payload.new as Car) : c))
          } else if (payload.eventType === 'DELETE') {
            setCars((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [setCars])

  async function handleCreate(params: Parameters<typeof createCar>[0]) {
    await createCar(params)
  }

  async function handleUpdate(params: Parameters<typeof updateCar>[1]) {
    if (!editingCar) return
    await updateCar(editingCar.id, params)
  }

  async function handleStatusUpdate(id: string, status: CarOperationalStatus) {
    setActionError('')
    try {
      await updateStatus(id, status)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-zinc-100 text-xl font-semibold">Carros</h1>
            {!loading && (
              <span className="text-xs text-zinc-500">
                {cars.filter((c) => c.operational_status === 'available').length} disponível(is) · {cars.length} total
              </span>
            )}
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Novo Carro</Button>
        </div>

        {actionError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-red-400 text-sm">{actionError}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            </div>
          ) : cars.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              Nenhum carro cadastrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Nº</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Piloto</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Copiloto</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Telefones</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Alterar status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr
                    key={car.id}
                    className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-100 font-mono font-medium">{car.number}</td>
                    <td className="px-4 py-3 text-zinc-100">{car.pilot_name}</td>
                    <td className="px-4 py-3 text-zinc-300">{car.copilot_name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div>{formatPhoneForDisplay(car.pilot_phone)}</div>
                      {car.copilot_phone && (
                        <div className="text-zinc-500 text-xs">{formatPhoneForDisplay(car.copilot_phone)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CarStatusBadge status={car.operational_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelector car={car} onUpdate={handleStatusUpdate} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCar(car)}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <CarFormModal
          driverUsers={driverUsers}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingCar && (
        <CarFormModal
          car={editingCar}
          driverUsers={driverUsers}
          onClose={() => setEditingCar(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  )
}
