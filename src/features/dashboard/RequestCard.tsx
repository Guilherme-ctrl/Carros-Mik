import { RequestStatusBadge } from '../requests/RequestStatusBadge'
import type { RequestWithLeader } from './useAllRequests'

function elapsedLabel(isoString: string): string {
  const minutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface Props {
  request: RequestWithLeader
  isSelected: boolean
  onClick: () => void
}

export function RequestCard({ request, isSelected, onClick }: Props) {
  const leaderName = request.leaders?.name ?? '—'
  const leaderTable = request.leaders?.table_name

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 space-y-1.5 transition-colors ${
        isSelected
          ? 'border-blue-500/50 bg-blue-500/5'
          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-zinc-100 text-xs font-semibold truncate">{request.event}</span>
          <span className="text-zinc-500 text-xs shrink-0">· Etapa {request.stage}</span>
        </div>
        <span className="text-zinc-500 text-xs tabular-nums shrink-0">{elapsedLabel(request.created_at)}</span>
      </div>
      <div className="flex items-center gap-2">
        <RequestStatusBadge status={request.status} />
        <span className="text-zinc-400 text-xs truncate">
          {leaderName}{leaderTable ? ` · ${leaderTable}` : ''}
        </span>
      </div>
      <p className="text-zinc-500 text-xs truncate">
        {request.street}, {request.street_number} — {request.neighborhood}
      </p>
    </button>
  )
}
