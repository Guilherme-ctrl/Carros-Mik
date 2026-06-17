import type { CarOperationalStatus } from './useCars'

const STATUS_CONFIG: Record<CarOperationalStatus, { label: string; className: string }> = {
  available:   { label: 'Disponível',   className: 'bg-status-available-bg text-status-available' },
  on_mission:  { label: 'Em missão',    className: 'bg-status-busy-bg text-status-busy' },
  offline:     { label: 'Offline',      className: 'bg-surface-2 text-on-surface-disabled' },
  unavailable: { label: 'Indisponível', className: 'bg-status-unavailable-bg text-status-unavailable' },
}

interface Props {
  status: CarOperationalStatus
}

export function CarStatusBadge({ status }: Props) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
