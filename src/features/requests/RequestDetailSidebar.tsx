import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { RequestStatusBadge } from './RequestStatusBadge'
import { RequestTimeline } from './RequestTimeline'
import { CommentsPanel } from './CommentsPanel'
import type { Request } from './useRequests'

interface CarInfo {
  pilot_name: string
  pilot_phone: string
  copilot_name: string | null
  copilot_phone: string | null
}

interface LeaderInfo {
  name: string
  phone: string
}

function formatDateBRT(isoString: string): string {
  const date = new Date(isoString)
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return brt.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  request: Request | null
  onClose: () => void
}

export function RequestDetailSidebar({ request, onClose }: Props) {
  const [car, setCar] = useState<CarInfo | null>(null)
  const [leader, setLeader] = useState<LeaderInfo | null>(null)
  const [timelineKey, setTimelineKey] = useState(0)

  useEffect(() => {
    if (!request) {
      setCar(null)
      setLeader(null)
      return
    }

    setCar(null)
    setLeader(null)
    setTimelineKey((k) => k + 1)

    if (request.assigned_car_id) {
      supabase
        .from('cars')
        .select('pilot_name, pilot_phone, copilot_name, copilot_phone')
        .eq('id', request.assigned_car_id)
        .maybeSingle()
        .then(({ data }) => setCar(data))
    }

    supabase
      .from('leaders')
      .select('name, phone')
      .eq('id', request.leader_id)
      .maybeSingle()
      .then(({ data }) => setLeader(data))
  }, [request])

  if (!request) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-zinc-100 font-semibold text-base truncate">{request.event}</h2>
              <RequestStatusBadge status={request.status} />
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">Etapa {request.stage} · {formatDateBRT(request.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Fields */}
          <div className="space-y-3">
            <_Field label="Endereço" value={`${request.street}, ${request.street_number} — ${request.neighborhood}`} />
            <_Field label="Objetivo" value={request.objective} />
            {request.notes && <_Field label="Observações" value={request.notes} />}
            {request.maps_link && (
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Mapa</p>
                <a
                  href={request.maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Abrir no Maps →
                </a>
              </div>
            )}
            {leader && (
              <_Field label="Líder" value={`${leader.name} · ${leader.phone}`} />
            )}
            {car && (
              <_Field label="Carro" value={[car.pilot_name, car.copilot_name].filter(Boolean).join(' / ')} />
            )}
          </div>

          {/* Histórico */}
          <RequestTimeline requestId={request.id} refreshKey={timelineKey} />

          {/* Comentários */}
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Comentários</p>
            <CommentsPanel
              requestId={request.id}
              contact={{
                pilotName: car?.pilot_name,
                pilotPhone: car?.pilot_phone,
                leaderName: leader?.name,
                leaderPhone: leader?.phone,
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function _Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-zinc-200 text-sm">{value}</p>
    </div>
  )
}
