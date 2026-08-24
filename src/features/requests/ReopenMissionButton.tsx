import { useState } from 'react'
import { Button } from '../../shared/components/ui/Button'
import { useReopenRequest } from './useReopenRequest'

interface Props {
  requestId: string
  onReopened?: () => void
}

// Contrapartida do encerramento: agora que fechar é um ato humano, ele pode ser
// um ato humano errado. Aparece só em missão encerrada.
export function ReopenMissionButton({ requestId, onReopened }: Props) {
  const [confirming, setConfirming] = useState(false)
  const { reopen, loading } = useReopenRequest()

  async function handleConfirm() {
    const ok = await reopen(requestId)
    if (ok) {
      setConfirming(false)
      onReopened?.()
    }
  }

  return (
    <div className="pt-2 border-t border-zinc-800 space-y-2">
      <p className="text-zinc-500 text-xs uppercase tracking-wide">Reabertura</p>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={loading}
        onClick={() => setConfirming(true)}
      >
        Reabrir missão
      </Button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-zinc-100 text-base font-semibold">Reabrir missão?</h2>
              <p className="text-zinc-400 text-sm">
                O desfecho registrado será apagado e a missão volta a ficar em andamento.
              </p>
            </div>

            {/* A expectativa precisa ser calibrada ANTES do clique: quem reabre
                imagina que a guarnição volta inteira, e nem sempre volta. */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-zinc-400 text-xs">
                Os carros que estavam na missão voltam, desde que ainda não tenham
                sido designados para outra. Os que já foram permanecem onde estão —
                o aviso dirá quais.
              </p>
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
                Reabrir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
