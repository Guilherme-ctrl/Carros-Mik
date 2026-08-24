interface Props {
  queueCount: number
}

// US8/FR9.3 — a car that cannot work while missions are still committed to it.
// FILA-ADR-9: "stranded" is derived by get_fleet_queue_overview, never a stored
// column, so this component only renders what the RPC already decided.
//
// Purely informative: nothing is resolved automatically (explicit decision in
// FR9.3), the operator sees the alert and acts.
export function QueueIndicatorIcon({ queueCount }: Props) {
  const label = `Carro indisponível com ${queueCount} ${queueCount === 1 ? 'missão' : 'missões'} na fila`

  return (
    <span
      data-testid="queue-indicator-icon"
      role="img"
      aria-label={label}
      title={label}
      className="shrink-0 cursor-help text-xs leading-none text-amber-400"
    >
      ⚠
    </span>
  )
}
