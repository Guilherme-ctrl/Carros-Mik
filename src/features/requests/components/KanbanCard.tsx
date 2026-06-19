import type { Request } from '../useRequests'
import { RequestStatusBadge } from '../RequestStatusBadge'
import { OutcomeBadge } from '../OutcomeBadge'

interface Props {
  request: Request
  onClick: () => void
  unreadCount?: number
}

export function KanbanCard({ request, onClick, unreadCount }: Props) {
  const isCancelled = request.status === 'cancelled'

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 cursor-pointer hover:border-zinc-700 transition-colors ${
        isCancelled ? 'opacity-50' : ''
      }`}
    >
      {unreadCount && unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10 pointer-events-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-zinc-100 text-sm font-medium truncate">{request.event}</p>
          <p className="text-zinc-500 text-xs">Etapa {request.stage}</p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <p className="text-zinc-400 text-xs">
        {request.street}, {request.street_number} — {request.neighborhood}
      </p>
      {request.outcome && <OutcomeBadge outcome={request.outcome} />}
    </div>
  )
}
