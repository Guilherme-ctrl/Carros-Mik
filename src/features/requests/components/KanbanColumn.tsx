import type { Request } from '../useRequests'
import { KanbanCard } from './KanbanCard'

interface Props {
  label: string
  headerClassName: string
  requests: Request[]
  emptyMessage: string
  onCardClick: (req: Request) => void
}

export function KanbanColumn({ label, headerClassName, requests, emptyMessage, onCardClick }: Props) {
  return (
    <div className="flex flex-col min-h-0 rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 border-b ${headerClassName}`}>
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-black/20 tabular-nums">
          {requests.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {requests.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-zinc-600 text-xs text-center px-4">
            {emptyMessage}
          </div>
        ) : (
          requests.map((req) => (
            <KanbanCard key={req.id} request={req} onClick={() => onCardClick(req)} />
          ))
        )}
      </div>
    </div>
  )
}
