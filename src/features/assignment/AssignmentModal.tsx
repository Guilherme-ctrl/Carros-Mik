import { Button } from '../../shared/components/ui/Button'
import type { Car } from '../cars/useCars'
import type { RequestWithLeader } from '../dashboard/useAllRequests'

interface Props {
  request: RequestWithLeader
  car: Car
  isReassignment: boolean
  willReleaseBusyCar: boolean
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}

export function AssignmentModal({
  request, car, isReassignment, willReleaseBusyCar, loading, onConfirm, onClose,
}: Props) {
  const leaderLabel = request.leaders?.table_name ?? request.leaders?.name ?? ''

  const title = willReleaseBusyCar
    ? 'Substituir missão do carro?'
    : isReassignment ? 'Reatribuir carro?' : 'Atribuir carro?'

  const messages: string[] = []
  if (willReleaseBusyCar) {
    messages.push(
      `Carro ${car.number} está em outra missão. Ao confirmar, a missão atual dele volta para "Aberta" (sem carro).`
    )
  }
  if (isReassignment) {
    messages.push('O carro anterior desta solicitação será liberado.')
  }
  if (messages.length === 0) {
    messages.push('Confirme a atribuição abaixo.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        <div className="space-y-1">
          <h2 className="text-zinc-100 text-base font-semibold">{title}</h2>
          {messages.map((msg) => (
            <p key={msg} className="text-zinc-400 text-sm">{msg}</p>
          ))}
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
            {willReleaseBusyCar ? 'Substituir' : isReassignment ? 'Reatribuir' : 'Confirmar'}
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
