import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import type { Car, DriverUser } from './useCars'

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

interface Props {
  car?: Car
  driverUsers: DriverUser[]
  onClose: () => void
  onSubmit: (params: {
    number: string
    pilot_name: string
    copilot_name: string | null
    pilot_phone: string
    copilot_phone: string | null
    driver_user_id: string | null
  }) => Promise<void>
}

export function CarFormModal({ car, driverUsers, onClose, onSubmit }: Props) {
  const isEdit = !!car

  const [number, setNumber] = useState(car?.number ?? '')
  const [pilotName, setPilotName] = useState(car?.pilot_name ?? '')
  const [copilotName, setCopilotName] = useState(car?.copilot_name ?? '')
  const [pilotPhoneDisplay, setPilotPhoneDisplay] = useState(car ? formatPhone(car.pilot_phone) : '')
  const [copilotPhoneDisplay, setCopilotPhoneDisplay] = useState(
    car?.copilot_phone ? formatPhone(car.copilot_phone) : ''
  )
  const [driverUserId, setDriverUserId] = useState(car?.driver_user_id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const pilotPhone = pilotPhoneDisplay.replace(/\D/g, '')
    if (pilotPhone.length < 10) {
      setError('Telefone do piloto inválido.')
      return
    }

    const copilotPhone = copilotPhoneDisplay.replace(/\D/g, '')
    if (copilotPhoneDisplay && copilotPhone.length < 10) {
      setError('Telefone do copiloto inválido.')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        number: number.trim(),
        pilot_name: pilotName.trim(),
        copilot_name: copilotName.trim() || null,
        pilot_phone: pilotPhone,
        copilot_phone: copilotPhone || null,
        driver_user_id: driverUserId || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar carro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-zinc-100 text-base font-semibold">
            {isEdit ? 'Editar Carro' : 'Novo Carro'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Input
            label="Número do carro"
            placeholder="Ex: 03"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Piloto"
            placeholder="Nome completo"
            value={pilotName}
            onChange={(e) => setPilotName(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Telefone do piloto"
            placeholder="(11) 99999-9999"
            value={pilotPhoneDisplay}
            onChange={(e) => setPilotPhoneDisplay(formatPhone(e.target.value))}
            required
            disabled={loading}
          />

          <Input
            label="Copiloto (opcional)"
            placeholder="Nome completo"
            value={copilotName}
            onChange={(e) => setCopilotName(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Telefone do copiloto (opcional)"
            placeholder="(11) 99999-9999"
            value={copilotPhoneDisplay}
            onChange={(e) => setCopilotPhoneDisplay(formatPhone(e.target.value))}
            disabled={loading}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="driver-user" className="text-sm font-medium text-zinc-300">
              Motorista (app) (opcional)
            </label>
            <select
              id="driver-user"
              value={driverUserId}
              onChange={(e) => setDriverUserId(e.target.value)}
              disabled={loading}
              className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-zinc-600 disabled:opacity-50"
            >
              <option value="">— Nenhum —</option>
              {driverUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {isEdit ? 'Salvar' : 'Criar carro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
