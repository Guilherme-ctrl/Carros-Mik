import { RequestStatusBadge } from '../requests/RequestStatusBadge'
import { isAwaitingClosure } from '../requests/awaitingClosure'
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
        {isAwaitingClosure(request.status, request.cars) && (
          <span
            className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400"
            title="Todos os carros já reportaram. A missão segue aberta e segurando os carros até alguém encerrar."
          >
            Encerrar
          </span>
        )}
        <span className="text-zinc-400 text-xs truncate">
          {leaderName}{leaderTable ? ` · ${leaderTable}` : ''}
        </span>
      </div>
      <p className="text-zinc-500 text-xs truncate">
        {request.street}, {request.street_number} — {request.neighborhood}
      </p>
      {request.cars.length > 0 && (
        <p className="text-zinc-400 text-xs truncate">
          <span className="text-zinc-500">{request.cars.length > 1 ? 'Carros ' : 'Carro '}</span>
          {request.cars.map((c) => `${c.number}`).join(', ')}
        </p>
      )}
    </button>
  )
}
