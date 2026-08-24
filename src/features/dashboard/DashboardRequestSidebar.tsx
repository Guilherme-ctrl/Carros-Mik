import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CarStatusBadge } from '../cars/CarStatusBadge'
import { RequestStatusBadge } from '../requests/RequestStatusBadge'
import { StatusTransitionButtons } from '../requests/StatusTransitionButtons'
import { RequestTimeline } from '../requests/RequestTimeline'
import { CloseMissionButton } from '../requests/CloseMissionButton'
import { useNudgeCar } from '../notifications/useNudgeCar'
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
  onInitiateAssign: (carIds: string[]) => void
  onRemoveCar: (carId: string) => void
}

// ADR-9 — was dashboard/RequestDetailSidebar.tsx; renamed to resolve the
// naming collision with requests/RequestDetailSidebar.tsx (now
// LeaderRequestSidebar.tsx), both of which are being touched by this same
// intent for multi-car rendering.
export function DashboardRequestSidebar({
  request, cars, onClose, onInitiateAssign, onRemoveCar,
}: Props) {
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([])
  const { nudge, nudgingCarId } = useNudgeCar()
  // Incremented on each request_history INSERT to trigger RequestTimeline re-fetch
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const assignedCarIds = new Set((request?.cars ?? []).map((c) => c.carId))
  // FR1.2 — no rigid cap on selection count (feasibility Q6=C).
  const availableForPicker = cars.filter((c) => !assignedCarIds.has(c.id))

  function handleAssignClick() {
    if (selectedCarIds.length === 0) return
    onInitiateAssign(selectedCarIds)
    setSelectedCarIds([])
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
    setSelectedCarIds([])
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

            {/* FR3-equivalent — roster of currently-assigned cars, plural */}
            {request.cars.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <p className="text-zinc-500 text-xs uppercase tracking-wide">
                  Carros atribuídos ({request.cars.length})
                </p>
                <div className="space-y-1.5">
                  {request.cars.map((ac) => (
                    <div
                      key={ac.carId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-zinc-100 text-xs font-semibold truncate">
                          Carro {ac.number} — {ac.pilotName}
                        </p>
                        <p className="text-zinc-500 text-[11px]">{CAR_STATUS_LABEL[ac.status] ?? ac.status}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                      {/* "Cutucar" — manda um push para o motorista deste carro
                          sem mexer na missão. Fica ao lado de Remover porque é
                          a alternativa mais branda para o mesmo impulso: o
                          carro não está respondendo. */}
                      <button
                        onClick={() => nudge(ac.carId, ac.number, request.id)}
                        disabled={nudgingCarId === ac.carId}
                        className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors text-xs px-2 py-1 rounded hover:bg-amber-500/10 disabled:opacity-40"
                        aria-label={`Cutucar carro ${ac.number}`}
                        title="Enviar uma notificação para o motorista deste carro"
                      >
                        {nudgingCarId === ac.carId ? '…' : 'Cutucar'}
                      </button>
                      {/* FR4 — remove this car without affecting the others */}
                      <button
                        onClick={() => onRemoveCar(ac.carId)}
                        className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
                        aria-label={`Remover carro ${ac.number}`}
                      >
                        Remover
                      </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FR1/FR1.4 — add car(s), multi-select */}
            {(request.status === 'open' || request.status === 'car_assigned') && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <p className="text-zinc-500 text-xs uppercase tracking-wide">
                  {request.cars.length > 0 ? 'Adicionar carro(s)' : 'Atribuir carro(s)'}
                </p>
                {availableForPicker.length === 0 ? (
                  <p className="text-zinc-600 text-xs">Nenhum outro carro disponível.</p>
                ) : (
                  <>
                    <CarPicker
                      cars={availableForPicker}
                      selectedCarIds={selectedCarIds}
                      onChange={setSelectedCarIds}
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={selectedCarIds.length === 0}
                      onClick={handleAssignClick}
                    >
                      {selectedCarIds.length > 1
                        ? `Atribuir ${selectedCarIds.length} carros`
                        : 'Atribuir Carro'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* T09.6 — request-level status transitions (open/under_review/cancel only —
                per-car progress (on_the_way/on_site/returning) is now driver-owned via
                update_car_status, not something Mesa Central drives from here) */}
            <StatusTransitionButtons
              requestId={request.id}
              currentStatus={request.status}
              onUpdated={() => setHistoryRefreshKey((k) => k + 1)}
            />

            {/* Encerramento manual (20260824000002). Fica fora do
                StatusTransitionButtons de propósito: aquilo são transições
                request-level livres (open/under_review/cancelar), e encerrar é
                a única que exige confirmação e derruba a frota inteira. */}
            {request.status === 'car_assigned' && (
              <CloseMissionButton
                requestId={request.id}
                cars={(request.cars ?? []).map((c) => ({
                  number: c.number,
                  outcome: c.outcome,
                }))}
                onClosed={() => setHistoryRefreshKey((k) => k + 1)}
              />
            )}

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
            {request.cars.map((ac) => {
              const car = cars.find((c) => c.id === ac.carId)
              return car ? (
                <WhatsAppContactButton
                  key={ac.carId}
                  name={car.pilot_name}
                  phone={car.pilot_phone}
                  messageTemplate="driver"
                />
              ) : null
            })}
            <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

const CAR_STATUS_LABEL: Record<string, string> = {
  car_assigned: 'Designado',
  on_the_way: 'A caminho',
  on_site: 'No local',
  returning: 'Retornando',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl>
      <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </dl>
  )
}

const CAR_SELECTABLE_STATUSES: Car['operational_status'][] = ['available', 'on_mission']

// Multi-select variant of the old single-select CarPicker (ADR-11 — same
// component family, `multiple` selection instead of one).
function CarPicker({
  cars, selectedCarIds, onChange,
}: {
  cars: Car[]
  selectedCarIds: string[]
  onChange: (carIds: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  function toggle(carId: string) {
    onChange(
      selectedCarIds.includes(carId)
        ? selectedCarIds.filter((id) => id !== carId)
        : [...selectedCarIds, carId]
    )
  }

  const label = selectedCarIds.length === 0
    ? 'Selecionar carro(s)…'
    : selectedCarIds
        .map((id) => cars.find((c) => c.id === id))
        .filter((c): c is Car => !!c)
        .map((c) => `Carro ${c.number}`)
        .join(', ')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600 transition-colors"
      >
        <span className={selectedCarIds.length > 0 ? '' : 'text-zinc-500'} title={label}>
          <span className="line-clamp-1">{label}</span>
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl divide-y divide-zinc-800">
          {cars.map((car) => {
            const selectable = CAR_SELECTABLE_STATUSES.includes(car.operational_status)
            const checked = selectedCarIds.includes(car.id)
            return (
              <button
                key={car.id}
                type="button"
                disabled={!selectable}
                onClick={() => toggle(car.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                  selectable
                    ? 'hover:bg-zinc-800 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                } ${checked ? 'bg-zinc-800/70' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      checked ? 'bg-[#E91E8C] border-[#E91E8C]' : 'border-zinc-600'
                    }`}
                    aria-hidden="true"
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <p className="text-zinc-100 text-xs font-semibold truncate">
                    Carro {car.number} — {car.pilot_name}
                  </p>
                </div>
                <CarStatusBadge status={car.operational_status} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
