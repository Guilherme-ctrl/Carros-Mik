import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Button } from '../../shared/components/ui/Button'
import { CreateUserModal } from './CreateUserModal'
import { EditRoleModal } from './EditRoleModal'
import { useUsers, type UserListItem } from './useUsers'

const ROLE_LABELS: Record<string, string> = {
  central_admin: 'Administrador',
  central_operator: 'Operador Central',
  table_leader: 'Líder de Mesa',
  driver: 'Motorista',
}

export function UsersPage() {
  const currentUserId = useAuth((s) => s.user?.id)
  const { users, loading, error, getUsers, createUser, updateRole, deactivateUser } = useUsers()

  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<UserListItem | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => { getUsers() }, [getUsers])

  async function handleCreate(params: { email: string; password: string; name: string; role: string }) {
    await createUser(params)
    await getUsers()
  }

  async function handleUpdateRole(userId: string, role: string) {
    await updateRole(userId, role)
    await getUsers()
  }

  async function handleDeactivate(user: UserListItem) {
    setActionError('')
    setActionLoading(user.id)
    try {
      await deactivateUser(user.id, user.banned)
      setConfirmDeactivate(null)
      await getUsers()
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
          <h1 className="text-zinc-100 text-xl font-semibold">Usuários</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Novo Usuário</Button>
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
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm">
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Papel</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-100">{user.name || '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{user.email}</td>
                    <td className="px-4 py-3 text-zinc-300">{user.role ? ROLE_LABELS[user.role] ?? user.role : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.banned
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {user.banned ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          Editar papel
                        </Button>
                        {user.id !== currentUserId && (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actionLoading === user.id}
                            onClick={() => user.banned ? handleDeactivate(user) : setConfirmDeactivate(user)}
                          >
                            {user.banned ? 'Reativar' : 'Inativar'}
                          </Button>
                        )}
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
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingUser && (
        <EditRoleModal
          currentRole={editingUser.role ?? 'driver'}
          userName={editingUser.name || editingUser.email}
          onClose={() => setEditingUser(null)}
          onSubmit={(role) => handleUpdateRole(editingUser.id, role)}
        />
      )}

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl space-y-4">
            <h2 className="text-zinc-100 text-base font-semibold">Inativar usuário?</h2>
            <p className="text-zinc-400 text-sm">
              <span className="text-zinc-200">{confirmDeactivate.name || confirmDeactivate.email}</span> perderá o acesso ao sistema imediatamente.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmDeactivate(null)}
                disabled={!!actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={actionLoading === confirmDeactivate.id}
                onClick={() => handleDeactivate(confirmDeactivate)}
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
