import type { RequestStatus } from './useRequests'

// Narrowed by U1 (ADR-3) to request-level values only — per-car progress
// (a caminho/no local/retornando) is now shown per car (FR7), not here.
const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  open:         { label: 'Aberta',     className: 'bg-status-pending-bg text-status-pending' },
  under_review: { label: 'Em análise', className: 'bg-status-busy-bg text-status-busy' },
  car_assigned: { label: 'Designado',  className: 'bg-status-done-bg text-status-done' },
  completed:    { label: 'Concluída',  className: 'bg-status-available-bg text-status-available' },
  cancelled:    { label: 'Cancelada',  className: 'bg-status-unavailable-bg text-status-unavailable' },
}

interface Props {
  status: RequestStatus
}

export function RequestStatusBadge({ status }: Props) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
