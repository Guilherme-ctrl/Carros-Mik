interface Props {
  active: boolean
}

export function StatusBadge({ active }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
      active
        ? 'bg-status-available-bg text-status-available'
        : 'bg-status-unavailable-bg text-status-unavailable'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}
