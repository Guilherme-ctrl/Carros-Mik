import { Button } from '../../shared/components/ui/Button'
import type { Car } from '../cars/useCars'
import type { RequestWithLeader } from '../dashboard/useAllRequests'

interface Props {
  request: RequestWithLeader
  car: Car
  isReassignment: boolean
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}

export function AssignmentModal({ request, car, isReassignment, loading, onConfirm, onClose }: Props) {
  const leaderLabel = request.leaders?.table_name ?? request.leaders?.name ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        <div className="space-y-1">
          <h2 className="text-zinc-100 text-base font-semibold">
            {isReassignment ? 'Reatribuir carro?' : 'Atribuir carro?'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {isReassignment ? 'O carro anterior será liberado.' : 'Confirme a atribuição abaixo.'}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <Row label="Carro" value={`Carro ${car.number} — ${car.pilot_name}`} />
          <Row label="Solicitação" value={`${request.event} · Etapa ${request.stage}`} />
          {leaderLabel && <Row label="Mesa" value={leaderLabel} />}
          <Row
            label="Endereço"
            value={`${request.street}, ${request.street_number} — ${request.neighborhood}`}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {isReassignment ? 'Reatribuir' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500 text-xs shrink-0">{label}</span>
      <span className="text-zinc-200 text-xs text-right">{value}</span>
    </div>
  )
}
