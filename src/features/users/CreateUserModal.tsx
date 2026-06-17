import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'

const ROLES = [
  { value: 'driver', label: 'Motorista' },
  { value: 'table_leader', label: 'Líder de Mesa' },
  { value: 'central_operator', label: 'Operador Central' },
  { value: 'central_admin', label: 'Administrador' },
]

interface Props {
  onClose: () => void
  onSubmit: (params: { email: string; password: string; name: string; role: string }) => Promise<void>
}

export function CreateUserModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('driver')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit({ email, password, name, role })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário'
      setError(msg.includes('already registered') ? 'Este email já está cadastrado.' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-zinc-100 text-base font-semibold">Novo Usuário</h2>
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
            label="Nome"
            placeholder="Ex: João Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Email"
            type="email"
            placeholder="joao@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Senha temporária"
            type="text"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Papel</label>
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
              Criar usuário
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
