import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import type { Leader } from './useLeaders'

interface Props {
  leader?: Leader
  onClose: () => void
  onSubmit: (params: { name: string; table_name: string | null; phone: string }) => Promise<void>
}

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function displayPhone(raw: string): string {
  return formatPhone(raw)
}

export function LeaderFormModal({ leader, onClose, onSubmit }: Props) {
  const isEdit = !!leader
  const [name, setName] = useState(leader?.name ?? '')
  const [tableName, setTableName] = useState(leader?.table_name ?? '')
  const [phoneDisplay, setPhoneDisplay] = useState(leader ? displayPhone(leader.phone) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handlePhoneChange(value: string) {
    setPhoneDisplay(formatPhone(value))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const phone = phoneDisplay.replace(/\D/g, '')
    if (phone.length < 10) {
      setError('Telefone inválido.')
      return
    }
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        table_name: tableName.trim() || null,
        phone,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar líder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-zinc-100 text-base font-semibold">
            {isEdit ? 'Editar Líder' : 'Novo Líder'}
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
            label="Nome"
            placeholder="Ex: João Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={phoneDisplay}
            onChange={(e) => handlePhoneChange(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Mesa (opcional)"
            placeholder="Ex: Mesa 12"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            disabled={loading}
          />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {isEdit ? 'Salvar' : 'Criar líder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
