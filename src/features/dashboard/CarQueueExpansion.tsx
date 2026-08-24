import { QueuePriorityRow } from './QueuePriorityRow'
import type { FleetQueueEntry, RequestPriority } from './useFleetQueue'

interface Props {
  carId: string
  queueItems: FleetQueueEntry['items']
  onPriorityChange: (requestId: string, priority: RequestPriority) => void
  disabled?: boolean
}

// US7 — the queue behind one car, expanded in place inside CarsStatusDropdown.
// No network call on expansion: the whole overview was already fetched when the
// dropdown mounted, so this only renders data already in memory
// (performance-design, "Sem chamada de rede na expansão").
//
// FILA-ADR-1 — the order is derived server-side (priority DESC, then
// requests.created_at ASC) and rendered as received. Sorting here would be a
// second, drifting source of truth for the promotion order.
export function CarQueueExpansion({ carId, queueItems, onPriorityChange, disabled }: Props) {
  return (
    <div
      data-testid={`car-queue-expansion-${carId}`}
      className="mt-2 space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2"
    >
      {queueItems.length === 0 ? (
        <p className="text-xs text-zinc-500">Nenhuma missão na fila.</p>
      ) : (
        queueItems.map((item) => (
          <QueuePriorityRow
            key={item.requestId}
            requestId={item.requestId}
            currentPriority={item.priority}
            label={item.label}
            onPriorityChange={onPriorityChange}
            disabled={disabled}
          />
        ))
      )}
    </div>
  )
}
