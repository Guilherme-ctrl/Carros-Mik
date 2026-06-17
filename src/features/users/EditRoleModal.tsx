import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/ui/Button'

const ROLES = [
  { value: 'driver', label: 'Motorista' },
  { value: 'table_leader', label: 'Líder de Mesa' },
  { value: 'central_operator', label: 'Operador Central' },
  { value: 'central_admin', label: 'Administrador' },
]

interface Props {
  currentRole: string
  userName: string
  onClose: () => void
  onSubmit: (role: string) => Promise<void>
}

export function EditRoleModal({ currentRole, userName, onClose, onSubmit }: Props) {
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(role)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar papel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-zinc-100 text-base font-semibold">Editar Papel</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{userName}</p>
          </div>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Novo papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
