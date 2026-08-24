import { useState } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { useCloseRequest } from './useCloseRequest'

export interface ClosableCar {
  number: string
  outcome: string | null
}

interface Props {
  requestId: string
  // Apenas os carros ATUAIS da missão (is_current). Carros que só têm esta
  // missão na fila não contam: eles não vão reportar desfecho nenhum enquanto
  // não forem promovidos, e esperar por eles travaria o encerramento para
  // sempre — é a mesma regra que close_request aplica no banco.
  cars: ClosableCar[]
  onClosed?: () => void
}

// O botão que encerra a missão. Antes de 20260824000002 não existia: quem
// encerrava era o "Achei"/"Não achei" do motorista, sem confirmação.
export function CloseMissionButton({ requestId, cars, onClosed }: Props) {
  const [confirming, setConfirming] = useState(false)
  const { closeRequest, loading } = useCloseRequest()

  const pending = cars.filter((c) => c.outcome === null).map((c) => c.number)
  const ready = cars.length > 0 && pending.length === 0

  if (cars.length === 0) return null

  async function handleConfirm() {
    const ok = await closeRequest(requestId)
    if (ok) {
      setConfirming(false)
      onClosed?.()
    }
  }

  return (
    <div className="pt-2 border-t border-zinc-800 space-y-2">
      <p className="text-zinc-500 text-xs uppercase tracking-wide">Encerramento</p>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        disabled={!ready || loading}
        onClick={() => setConfirming(true)}
      >
        Encerrar missão
      </Button>

      {!ready && (
        // O botão fica visível e desabilitado, com o motivo. Escondê-lo faria a
        // Mesa Central procurar um botão que não está lá em vez de cobrar o
        // desfecho no rádio.
        <p className="text-zinc-500 text-xs">
          {pending.length === 1
            ? `Aguardando o desfecho do carro ${pending[0]}.`
            : `Aguardando o desfecho dos carros ${pending.join(', ')}.`}
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-zinc-100 text-base font-semibold">Encerrar missão?</h2>
              <p className="text-zinc-400 text-sm">
                {cars.length > 1
                  ? `A missão será finalizada para os ${cars.length} carros, que ficarão livres para a próxima. Não dá para desfazer.`
                  : 'A missão será finalizada e o carro ficará livre para a próxima. Não dá para desfazer.'}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              {cars.map((c) => (
                <div key={c.number} className="flex justify-between gap-4">
                  <span className="text-zinc-500 text-xs shrink-0">Carro {c.number}</span>
                  <span className="text-zinc-200 text-xs text-right">
                    {c.outcome === 'found' ? 'Achei' : 'Não achei'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirm} loading={loading} className="flex-1">
                Encerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
