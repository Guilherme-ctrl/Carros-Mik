import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../shared/components/ui/Button'
import { useCars } from '../cars/useCars'
import { useCarMessages } from './useCarMessages'

function hora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))
}

// Conversa privada do gestor com cada carro. Rota restrita ao Administrador —
// mas quem de fato garante o sigilo é a RLS de car_messages, não esta rota.
export function CarChatPage() {
  const { cars, getCars } = useCars()
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const { messages, loading, send } = useCarMessages(selectedCarId)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { getCars() }, [getCars])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const selectedCar = cars.find((c) => c.id === selectedCarId) ?? null

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await send(text)
      setDraft('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950">
      {/* Frota à esquerda: o gestor pensa em carros, não em nomes. */}
      <div className="w-56 shrink-0 border-r border-zinc-800 overflow-y-auto">
        <p className="text-zinc-500 text-xs uppercase tracking-wide px-4 py-3">
          Carros ({cars.length})
        </p>
        {cars.map((car) => (
          <button
            key={car.id}
            onClick={() => setSelectedCarId(car.id)}
            className={`w-full text-left px-4 py-2.5 border-l-2 transition-colors ${
              selectedCarId === car.id
                ? 'border-brand-pink bg-zinc-900 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:bg-zinc-900/50'
            }`}
          >
            <p className="text-sm font-semibold">Carro {car.number}</p>
            <p className="text-xs text-zinc-500 truncate">{car.pilot_name}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedCar ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">Escolha um carro para conversar.</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-zinc-800 shrink-0">
              <p className="text-zinc-100 text-sm font-semibold">
                Carro {selectedCar.number} — {selectedCar.pilot_name}
              </p>
              <p className="text-zinc-500 text-xs">
                Conversa privada: só você e este carro veem.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {loading && messages.length === 0 && (
                <p className="text-zinc-500 text-xs">Carregando…</p>
              )}
              {!loading && messages.length === 0 && (
                <p className="text-zinc-500 text-xs">Nenhuma mensagem ainda.</p>
              )}
              {messages.map((m) => {
                const doGestor = m.author_role === 'central_admin'
                return (
                  <div key={m.id} className={`flex ${doGestor ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        doGestor
                          ? 'bg-brand-pink/15 border border-brand-pink/30'
                          : 'bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      <p className="text-zinc-500 text-[10px] mb-0.5">
                        {m.author_name} · {hora(m.created_at)}
                      </p>
                      <p className="text-zinc-200 text-sm whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 shrink-0 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={`Mensagem para o carro ${selectedCar.number}…`}
                disabled={sending}
                className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 disabled:opacity-50"
              />
              <Button size="sm" onClick={handleSend} loading={sending} disabled={!draft.trim()}>
                Enviar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
