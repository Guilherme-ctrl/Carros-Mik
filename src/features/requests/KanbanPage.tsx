import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Button } from '../../shared/components/ui/Button'
import { RequestDetailSidebar } from './RequestDetailSidebar'
import { useRequests, type Request } from './useRequests'
import { KanbanColumn } from './components/KanbanColumn'
import { getKanbanColumn } from './kanbanUtils'
import { useUnreadMessageCounts } from '../notifications/useUnreadMessageCounts'

const CENTRAL_ROLES = new Set(['central_admin', 'central_operator'])

export function KanbanPage() {
  const navigate = useNavigate()
  const role = useAuth((s) => s.role)
  const signOut = useAuth((s) => s.signOut)
  const isCentral = CENTRAL_ROLES.has(role ?? '')
  const { requests, setRequests, loading, error, getMyRequests, getAllRequests } = useRequests()
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const userIdRef = useRef<string | null>(null)
  const unreadCounts = useUnreadMessageCounts()

  useEffect(() => {
    if (isCentral) {
      getAllRequests()
    } else {
      getMyRequests()
      supabase.auth.getUser().then(({ data: { user } }) => {
        userIdRef.current = user?.id ?? null
      })
    }
  }, [isCentral, getAllRequests, getMyRequests])

  useEffect(() => {
    const channel = supabase
      .channel('kanban-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (isCentral || payload.new.leader_user_id === userIdRef.current) {
              setRequests((prev) =>
                prev.some((r) => r.id === payload.new.id)
                  ? prev
                  : [...prev, payload.new as Request]
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            setRequests((prev) =>
              prev.map((r) => r.id === payload.new.id ? (payload.new as Request) : r)
            )
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [setRequests])

  const sorted = useMemo(
    () => [...requests].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [requests]
  )

  const todo  = useMemo(() => sorted.filter((r) => getKanbanColumn(r.status) === 'todo'),  [sorted])
  const doing = useMemo(() => sorted.filter((r) => getKanbanColumn(r.status) === 'doing'), [sorted])
  const done  = useMemo(() => sorted.filter((r) => getKanbanColumn(r.status) === 'done'),  [sorted])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 p-4 md:p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-zinc-100 text-xl font-semibold">
          {isCentral ? 'Todas as Solicitações' : 'Minhas Solicitações'}
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
          <Button size="sm" onClick={() => navigate('/requests/new')}>+ Nova Solicitação</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 shrink-0">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <span className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-x-auto">
          <KanbanColumn
            label="Para fazer"
            headerClassName="bg-amber-500/10 text-amber-400 border-amber-500/20"
            requests={todo}
            emptyMessage="Nenhuma solicitação pendente"
            onCardClick={setSelectedRequest}
            unreadCounts={unreadCounts}
          />
          <KanbanColumn
            label="Fazendo"
            headerClassName="bg-blue-500/10 text-blue-400 border-blue-500/20"
            requests={doing}
            emptyMessage="Nenhum carro em andamento"
            onCardClick={setSelectedRequest}
            unreadCounts={unreadCounts}
          />
          <KanbanColumn
            label="Feito"
            headerClassName="bg-green-500/10 text-green-400 border-green-500/20"
            requests={done}
            emptyMessage="Nenhuma solicitação concluída"
            onCardClick={setSelectedRequest}
            unreadCounts={unreadCounts}
          />
        </div>
      )}

      <RequestDetailSidebar
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  )
}
