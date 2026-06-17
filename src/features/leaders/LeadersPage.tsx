import { useEffect, useState } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { LeaderFormModal } from './LeaderFormModal'
import { StatusBadge } from './StatusBadge'
import { useLeaders, type Leader } from './useLeaders'

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function LeadersPage() {
  const { leaders, loading, error, getLeaders, createLeader, updateLeader, toggleActive } = useLeaders()

  const [showCreate, setShowCreate] = useState(false)
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Leader | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => { getLeaders() }, [getLeaders])

  async function handleCreate(params: { name: string; table_name: string | null; phone: string }) {
    await createLeader(params)
    await getLeaders()
  }

  async function handleUpdate(params: { name: string; table_name: string | null; phone: string }) {
    if (!editingLeader) return
    await updateLeader(editingLeader.id, params)
    await getLeaders()
  }

  async function handleToggle(leader: Leader) {
    setActionError('')
    setActionLoading(leader.id)
    try {
      await toggleActive(leader.id, leader.is_active)
      setConfirmToggle(null)
      await getLeaders()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao alterar status')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-zinc-100 text-xl font-semibold">Líderes</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Novo Líder</Button>
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
          ) : leaders.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              Nenhum líder cadastrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Mesa</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Telefone</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {leaders.map((leader) => (
                  <tr key={leader.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-100">{leader.name}</td>
                    <td className="px-4 py-3 text-zinc-300">{leader.table_name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatPhone(leader.phone)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={leader.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingLeader(leader)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={actionLoading === leader.id}
                          onClick={() => leader.is_active ? setConfirmToggle(leader) : handleToggle(leader)}
                        >
                          {leader.is_active ? 'Inativar' : 'Reativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <LeaderFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingLeader && (
        <LeaderFormModal
          leader={editingLeader}
          onClose={() => setEditingLeader(null)}
          onSubmit={handleUpdate}
        />
      )}

      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl space-y-4">
            <h2 className="text-zinc-100 text-base font-semibold">Inativar líder?</h2>
            <p className="text-zinc-400 text-sm">
              <span className="text-zinc-200">{confirmToggle.name}</span> não aparecerá mais no dropdown de solicitações.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmToggle(null)}
                disabled={!!actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={actionLoading === confirmToggle.id}
                onClick={() => handleToggle(confirmToggle)}
              >
                Inativar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
