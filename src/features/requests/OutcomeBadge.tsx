import type { RequestOutcome } from './useRequests'

interface Props {
  outcome: RequestOutcome
}

export function OutcomeBadge({ outcome }: Props) {
  if (outcome === 'found') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-950 border border-green-700/40 text-green-400 text-[10px] font-semibold uppercase tracking-wide">
        ✓ Achei
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700/40 text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
      ✗ Não achei
    </span>
  )
}
