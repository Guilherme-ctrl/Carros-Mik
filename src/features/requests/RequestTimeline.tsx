import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { RequestStatus } from './useRequests'

interface HistoryEntry {
  id: string
  from_status: RequestStatus | null
  to_status: RequestStatus
  changed_by: string | null
  notes: string | null
  created_at: string
  changed_by_name: string
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  open:         'Aberta',
  under_review: 'Em análise',
  car_assigned: 'Designado',
  on_the_way:   'A caminho',
  on_site:      'No local',
  returning:    'Retornando',
  completed:    'Concluída',
  cancelled:    'Cancelada',
}

// T09.12 — display times in GMT-3
function formatBRT(iso: string): string {
  const d = new Date(iso)
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return format(brt, 'dd/MM HH:mm')
}

interface Props {
  requestId: string
  refreshKey: number
}

export function RequestTimeline({ requestId, refreshKey }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const { data: rows, error } = await supabase
        .from('request_history')
        .select('id, from_status, to_status, changed_by, notes, created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })

      if (error || !rows) return

      // T09.8 — resolve user names from profiles view
      const userIds = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))] as string[]
      let nameMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds)

        nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name ?? '—']))
      }

      setEntries(
        rows.map((r) => ({
          ...r,
          changed_by_name: r.changed_by ? (nameMap[r.changed_by] ?? '—') : 'Sistema',
        })),
      )
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory, refreshKey])

  if (loading && entries.length === 0) {
    return <p className="text-zinc-600 text-xs">Carregando histórico…</p>
  }

  if (entries.length === 0) return null

  return (
    <div className="pt-2 border-t border-zinc-800">
      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Histórico</p>
      <div className="space-y-0">
        {entries.map((entry, idx) => {
          const isLast = idx === entries.length - 1
          const dotColor =
            entry.to_status === 'completed' ? 'bg-green-400' :
            entry.to_status === 'cancelled'  ? 'bg-red-400' :
            idx === 0                         ? 'bg-zinc-600' : 'bg-zinc-500'

          return (
            <div key={entry.id} className="flex gap-3 text-xs">
              <div className="flex flex-col items-center shrink-0 w-3">
                <div className={`w-2 h-2 rounded-full mt-0.5 ${dotColor}`} />
                {!isLast && <div className="w-px flex-1 bg-zinc-800 mt-1" />}
              </div>
              <div className={`${isLast ? 'pb-0' : 'pb-3'}`}>
                <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                  <span className="text-zinc-200 font-medium">
                    {STATUS_LABEL[entry.to_status]}
                  </span>
                  {entry.from_status && (
                    <span className="text-zinc-600">← {STATUS_LABEL[entry.from_status]}</span>
                  )}
                </div>
                <div className="text-zinc-500 mt-0.5">
                  {entry.changed_by_name} · {formatBRT(entry.created_at)}
                </div>
                {entry.notes && (
                  <div className="text-zinc-400 mt-0.5 italic">{entry.notes}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
