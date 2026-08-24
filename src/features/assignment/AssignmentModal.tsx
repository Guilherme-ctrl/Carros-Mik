import { Button } from '../../shared/components/ui/Button'
import type { Car } from '../cars/useCars'
import type { RequestWithLeader } from '../dashboard/useAllRequests'
import { EnqueueOrTransferMenu } from './EnqueueOrTransferMenu'
import type { AssignMode } from './useAssignCar'

interface BusyConflict {
  car: Car
  conflictingRequestId: string
}

interface Props {
  request: RequestWithLeader
  selectedCars: Car[]
  conflict: BusyConflict | null
  loading: boolean
  // FILA-ADR-4 — the confirmation now carries WHICH resolution the operator
  // chose. On the no-conflict path there is nothing to fork on, so it is called
  // with 'transfer' by convention and the value is ignored downstream (a free
  // car is assigned outright under either mode).
  onConfirm: (mode: AssignMode) => void
  onClose: () => void
}

// ADR-4 — a busy car is never silently stolen: the modal always renders a
// summary of the selected car(s), and when the RPC reports a conflict, an
// explicit second confirmation step is required before confirmTransfer runs.
//
// FR2.1 — that second step is no longer a yes/no: the operator picks between
// enqueueing behind the car's current mission and transferring it right now.
export function AssignmentModal({
  request, selectedCars, conflict, loading, onConfirm, onClose,
}: Props) {
  const leaderLabel = request.leaders?.table_name ?? request.leaders?.name ?? ''
  const isMulti = selectedCars.length > 1

  const title = conflict
    ? 'Carro ocupado — como atribuir?'
    : isMulti ? `Atribuir ${selectedCars.length} carros?` : 'Atribuir carro?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        <div className="space-y-1">
          <h2 className="text-zinc-100 text-base font-semibold">{title}</h2>
          {conflict ? (
            // CORRIGIDO — achado ao vivo: encurtado porque os botões abaixo
            // (EnqueueOrTransferMenu) agora carregam sua própria explicação —
            // repetir o mesmo texto aqui em parágrafo + de novo em cada botão
            // era redundante.
            <p className="text-zinc-400 text-sm">
              Carro {conflict.car.number} está em outra missão em andamento. O que você quer fazer?
            </p>
          ) : (
            <p className="text-zinc-400 text-sm">Confirme a atribuição abaixo.</p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          {conflict ? (
            <Row label="Carro" value={`Carro ${conflict.car.number} — ${conflict.car.pilot_name}`} />
          ) : (
            selectedCars.map((car) => (
              <Row key={car.id} label="Carro" value={`Carro ${car.number} — ${car.pilot_name}`} />
            ))
          )}
          <Row label="Solicitação" value={`${request.event} · Etapa ${request.stage}`} />
          {leaderLabel && <Row label="Mesa" value={leaderLabel} />}
          <Row
            label="Endereço"
            value={`${request.street}, ${request.street_number} — ${request.neighborhood}`}
          />
        </div>

        {conflict ? (
          // CORRIGIDO — achado ao vivo (feedback direto): a versão anterior
          // escondia Enfileirar/Transferir atrás de um botão "Confirmar" que
          // abria um popup — um clique de confirmação a mais, sem nenhuma
          // pista visual. Agora as 2 opções ficam explícitas e visíveis desde
          // o início; "Cancelar" fica numa linha própria abaixo, menos
          // proeminente (é a saída, não uma das duas escolhas reais).
          <div className="space-y-2">
            <EnqueueOrTransferMenu
              carLabel={`Carro ${conflict.car.number}`}
              onSelect={onConfirm}
              disabled={loading}
            />
            <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full">
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            {/* No conflict, no fork to make — 'transfer' is the conventional
                value here and is ignored downstream (a free car is assigned
                outright under either mode). */}
            <Button
              data-testid="assignment-confirm"
              onClick={() => onConfirm('transfer')}
              loading={loading}
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        )}
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
