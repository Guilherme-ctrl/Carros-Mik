import { useState } from 'react'
import { RequestCard } from './RequestCard'
import type { RequestWithLeader } from './useAllRequests'
import type { RequestStatus } from '../requests/useRequests'

const ACTIVE_STATUSES: RequestStatus[] = [
  'open', 'under_review', 'car_assigned', 'on_the_way', 'on_site', 'returning',
]
const HISTORY_STATUSES: RequestStatus[] = ['completed', 'cancelled']

const STATUS_LABELS: Partial<Record<RequestStatus, string>> = {
  open: 'Aberta',
  under_review: 'Em análise',
  car_assigned: 'Designado',
  on_the_way: 'A caminho',
  on_site: 'No local',
  returning: 'Retornando',
}

interface Props {
  requests: RequestWithLeader[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelectRequest: (request: RequestWithLeader) => void
  unreadCounts: Record<string, number>
  fullWidth?: boolean
  isOpen?: boolean
  onToggle?: () => void
}

export function RequestsPanel({ requests, loading, error, selectedId, onSelectRequest, unreadCounts, fullWidth, isOpen, onToggle }: Props) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')

  const activeRequests = requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const filteredActive =
    statusFilter === 'all'
      ? activeRequests
      : activeRequests.filter((r) => r.status === statusFilter)
  const historyRequests = requests.filter((r) => HISTORY_STATUSES.includes(r.status))
  const openCount = requests.filter((r) => r.status === 'open').length

  const containerClass = fullWidth
    ? 'flex-1 w-full flex flex-col border-r border-zinc-800 overflow-hidden'
    : 'min-w-0 overflow-hidden flex flex-col border-r border-zinc-800'

  return (
    <div className={containerClass}>
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-100 text-sm font-semibold">Solicitações</span>
          <div className="flex items-center gap-2">
            {openCount > 0 && (
              <span className="rounded-full bg-blue-600 text-white text-xs font-bold px-2 py-0.5 min-w-[20px] text-center">
                {openCount}
              </span>
            )}
            {onToggle && (
              <button
                onClick={onToggle}
                className="p-1 text-zinc-500 hover:text-zinc-100 transition-colors rounded"
                aria-label={isOpen ? 'Minimizar painel' : 'Restaurar painel'}
              >
                {isOpen !== false ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          <FilterChip
            label="Todas"
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          {ACTIVE_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={STATUS_LABELS[s] ?? s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error && <p className="text-red-400 text-xs">{error}</p>}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredActive.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-10">Nenhuma solicitação ativa.</p>
        ) : (
          filteredActive.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              isSelected={req.id === selectedId}
              onClick={() => onSelectRequest(req)}
              unreadCount={unreadCounts[req.id]}
            />
          ))
        )}

        {historyRequests.length > 0 && !loading && (
          <>
            <p className="text-zinc-600 text-xs font-medium uppercase tracking-wide pt-3 pb-1">
              Histórico ({historyRequests.length})
            </p>
            {historyRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                isSelected={req.id === selectedId}
                onClick={() => onSelectRequest(req)}
                unreadCount={unreadCounts[req.id]}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
        active ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 p-3 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-3 bg-zinc-800 rounded w-2/3" />
        <div className="h-5 bg-zinc-800 rounded-full w-16 ml-auto" />
      </div>
      <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
      <div className="h-2.5 bg-zinc-800 rounded w-full" />
    </div>
  )
}
