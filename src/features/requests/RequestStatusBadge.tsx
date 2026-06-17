import type { RequestStatus } from './useRequests'

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  open:         { label: 'Aberta',     className: 'bg-status-pending-bg text-status-pending' },
  under_review: { label: 'Em análise', className: 'bg-status-busy-bg text-status-busy' },
  car_assigned: { label: 'Designado',  className: 'bg-status-done-bg text-status-done' },
  on_the_way:   { label: 'A caminho',  className: 'bg-status-busy-bg text-status-busy' },
  on_site:      { label: 'No local',   className: 'bg-status-available-bg text-status-available' },
  returning:    { label: 'Retornando', className: 'bg-status-done-bg text-status-done' },
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
