import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { RequestStatusBadge } from '../requests/RequestStatusBadge'
import { StatusTransitionButtons } from '../requests/StatusTransitionButtons'
import { RequestTimeline } from '../requests/RequestTimeline'
import { Button } from '../../shared/components/ui/Button'
import { WhatsAppContactButton } from '../../shared/components/WhatsAppContactButton'
import type { Car } from '../cars/useCars'
import type { RequestWithLeader } from './useAllRequests'

function formatDateBRT(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso)).replace(', ', ' ')
}

interface Props {
  request: RequestWithLeader | null
  cars: Car[]
  onClose: () => void
  onInitiateAssign: (car: Car) => void
}

export function RequestDetailSidebar({ request, cars, onClose, onInitiateAssign }: Props) {
  const [selectedCarId, setSelectedCarId] = useState('')
  // Incremented on each request_history INSERT to trigger RequestTimeline re-fetch
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const availableCars = cars.filter((c) => c.operational_status === 'available')
  const isAssigned = request?.status === 'car_assigned'

  function handleCarChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCarId(e.target.value)
  }

  function handleAssignClick() {
    const car = cars.find((c) => c.id === selectedCarId)
    if (car) onInitiateAssign(car)
  }

  // T09.9 — Realtime subscription on request_history for the open request
  useEffect(() => {
    if (!request) return

    const channel = supabase
      .channel(`request-history:${request.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_history',
          filter: `request_id=eq.${request.id}`,
        },
        () => setHistoryRefreshKey((k) => k + 1),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [request?.id])

  // Reset car selection when the selected request changes
  useEffect(() => {
    setSelectedCarId('')
  }, [request?.id])

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
        request ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {request && (
        <>
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
            <h2 className="text-zinc-100 text-sm font-semibold">Detalhe da Solicitação</h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-100 text-base font-semibold">{request.event}</span>
                <span className="text-zinc-500 text-sm">· Etapa {request.stage}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <RequestStatusBadge status={request.status} />
                <span className="text-zinc-500 text-xs">{formatDateBRT(request.created_at)}</span>
              </div>
            </div>

            <Field label="Líder">
              <span className="text-zinc-200">{request.leaders?.name ?? '—'}</span>
              {request.leaders?.table_name && (
                <span className="text-zinc-500"> · {request.leaders.table_name}</span>
              )}
            </Field>

            <Field label="Endereço">
              <span className="text-zinc-200">
                {request.street}, {request.street_number}
                <br />
                <span className="text-zinc-400">{request.neighborhood}</span>
              </span>
            </Field>

            <Field label="Objetivo">
              <span className="text-zinc-200">{request.objective}</span>
            </Field>

            {request.notes && (
              <Field label="Observações">
                <span className="text-zinc-300">{request.notes}</span>
              </Field>
            )}

            {request.maps_link && (
              <div>
                <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Maps</dt>
                <a
                  href={request.maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Abrir no Google Maps →
                </a>
              </div>
            )}

            {/* T08.7 — assign car; T08.8 — reassign when already car_assigned */}
            {(request.status === 'open' ||
              request.status === 'under_review' ||
              request.status === 'car_assigned') && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <p className="text-zinc-500 text-xs uppercase tracking-wide">
                  {isAssigned ? 'Reatribuir carro' : 'Atribuir carro'}
                </p>
                {availableCars.length === 0 ? (
                  <p className="text-zinc-600 text-xs">Nenhum carro disponível.</p>
                ) : (
                  <>
                    <select
                      value={selectedCarId}
                      onChange={handleCarChange}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecionar carro…</option>
                      {availableCars.map((c) => (
                        <option key={c.id} value={c.id}>
                          Carro {c.number} — {c.pilot_name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!selectedCarId}
                      onClick={handleAssignClick}
                    >
                      {isAssigned ? 'Reatribuir' : 'Atribuir Carro'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* T09.6 — status transition buttons */}
            <StatusTransitionButtons
              requestId={request.id}
              currentStatus={request.status}
              onUpdated={() => setHistoryRefreshKey((k) => k + 1)}
            />

            {/* T09.7 — chronological request history */}
            <RequestTimeline
              requestId={request.id}
              refreshKey={historyRefreshKey}
            />
          </div>

          <div className="px-5 py-4 border-t border-zinc-800 shrink-0 space-y-2">
            <WhatsAppContactButton
              name={request.leaders?.name ?? ''}
              phone={request.leaders?.phone}
              messageTemplate="leader"
            />
            {(() => {
              const assignedCar = cars.find((c) => c.id === request.assigned_car_id)
              return assignedCar ? (
                <WhatsAppContactButton
                  name={assignedCar.pilot_name}
                  phone={assignedCar.pilot_phone}
                  messageTemplate="driver"
                />
              ) : null
            })()}
            <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl>
      <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </dl>
  )
}
