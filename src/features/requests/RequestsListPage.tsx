import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { Button } from '../../shared/components/ui/Button'
import { RequestDetailSidebar } from './RequestDetailSidebar'
import { RequestStatusBadge } from './RequestStatusBadge'
import { useRequests, type Request } from './useRequests'

const CENTRAL_ROLES = new Set(['central_admin', 'central_operator'])

function formatDateBRT(isoString: string): string {
  const date = new Date(isoString)
  // BRT is UTC-3 (Brazil abolished DST in 2019 — fixed offset year-round)
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return format(brt, 'dd/MM HH:mm')
}

const CANCELLABLE = new Set(['open', 'under_review'])

export function RequestsListPage() {
  const navigate = useNavigate()
  const role = useAuth((s) => s.role)
  const signOut = useAuth((s) => s.signOut)
  const isCentral = CENTRAL_ROLES.has(role ?? '')
  const { requests, setRequests, loading, error, getMyRequests, getAllRequests, cancelRequest } = useRequests()

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState('')
  const userIdRef = useRef<string | null>(null)

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
      .channel('requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (isCentral || payload.new.leader_user_id === userIdRef.current) {
              setRequests((prev) => [payload.new as Request, ...prev])
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

  async function handleCancel() {
    if (!confirmId) return
    setCancelling(true)
    setActionError('')
    try {
      await cancelRequest(confirmId)
      setConfirmId(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao cancelar')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-zinc-100 text-xl font-semibold">
            {isCentral ? 'Todas as Solicitações' : 'Minhas Solicitações'}
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
            <Button size="sm" onClick={() => navigate('/requests/new')}>+ Nova Solicitação</Button>
          </div>
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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-16 text-center text-zinc-500 text-sm">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2 cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => setSelectedRequest(req)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-100 text-sm font-medium">{req.event}</span>
                      <span className="text-zinc-500 text-xs">· Etapa {req.stage}</span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                    <p className="text-zinc-400 text-xs mt-1">
                      {req.street}, {req.street_number} — {req.neighborhood}
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{req.objective}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-zinc-500 text-xs tabular-nums">
                      {formatDateBRT(req.created_at)}
                    </span>
                    {CANCELLABLE.has(req.status) && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setActionError(''); setConfirmId(req.id) }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                {req.maps_link && (
                  <a
                    href={req.maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Ver no Maps
                  </a>
                )}
                {req.notes && (
                  <p className="text-zinc-500 text-xs border-t border-zinc-800 pt-2">{req.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <RequestDetailSidebar
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl space-y-4">
            <h2 className="text-zinc-100 text-base font-semibold">Cancelar solicitação?</h2>
            <p className="text-zinc-400 text-sm">Esta ação não pode ser desfeita.</p>
            {actionError && <p className="text-red-400 text-sm">{actionError}</p>}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmId(null)}
                disabled={cancelling}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                loading={cancelling}
                className="flex-1"
              >
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
