import type { RequestPriority } from './useFleetQueue'

interface Props {
  requestId: string
  currentPriority: RequestPriority
  label: string
  onPriorityChange: (requestId: string, priority: RequestPriority) => void
  // Mirrors useFleetQueue's `loading`. The update is pessimistic (nfr-design
  // Q2=A), so the select stays locked until the refetch confirms the new order —
  // otherwise the operator could queue up several conflicting writes against a
  // list that has not moved yet.
  disabled?: boolean
}

// FILA-ADR-2 — a closed enum of 3 values. Ordered high-to-low so the option that
// moves a mission to the head of the queue reads first.
const PRIORITY_OPTIONS: Array<{ value: RequestPriority; label: string }> = [
  { value: 'alta', label: 'Alta' },
  { value: 'normal', label: 'Normal' },
  { value: 'baixa', label: 'Baixa' },
]

// US7 — one queued mission, with the priority selector that reorders it.
// `label` is requests.event, carried by the RPC's items[] (already rendered
// elsewhere today, see RequestCard). Mesa Central has unrestricted read on
// requests, so it gets the human label the driver-side RPC withholds
// (FILA-ADR-5 applies to the mobile projection, not this one).
export function QueuePriorityRow({
  requestId, currentPriority, label, onPriorityChange, disabled,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      {/* Plain JSX interpolation — React escapes it; never dangerouslySetInnerHTML. */}
      <span className="min-w-0 truncate text-xs text-zinc-300" title={label}>{label}</span>
      <select
        data-testid={`queue-priority-select-${requestId}`}
        aria-label={`Prioridade de ${label}`}
        value={currentPriority}
        disabled={disabled}
        onChange={(e) => onPriorityChange(requestId, e.target.value as RequestPriority)}
        className="shrink-0 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
