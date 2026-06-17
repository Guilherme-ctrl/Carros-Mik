import toast from 'react-hot-toast'
import { Button } from '../../shared/components/ui/Button'
import { useUpdateStatus } from './useUpdateStatus'
import type { RequestStatus } from './useRequests'

// Valid next states for each status, excluding car_assigned (handled by the car picker).
const NEXT_STATES: Partial<Record<RequestStatus, RequestStatus[]>> = {
  open:         ['under_review', 'cancelled'],
  under_review: ['cancelled'],
  car_assigned: ['on_the_way', 'cancelled'],
  on_the_way:   ['on_site'],
  on_site:      ['returning', 'completed'],
  returning:    ['completed'],
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

interface Props {
  requestId: string
  currentStatus: RequestStatus
  onUpdated?: () => void
}

export function StatusTransitionButtons({ requestId, currentStatus, onUpdated }: Props) {
  const { updateStatus, loading } = useUpdateStatus()
  const nextStates = NEXT_STATES[currentStatus] ?? []

  if (nextStates.length === 0) return null

  async function handleTransition(newStatus: RequestStatus) {
    try {
      await updateStatus(requestId, newStatus)
      toast.success(`Status → ${STATUS_LABEL[newStatus]}`)
      onUpdated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status'
      toast.error(msg.includes('inválida') ? 'Transição inválida' : 'Erro ao atualizar status')
    }
  }

  return (
    <div className="pt-2 border-t border-zinc-800 space-y-2">
      <p className="text-zinc-500 text-xs uppercase tracking-wide">Avançar status</p>
      <div className="flex flex-wrap gap-2">
        {nextStates.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === 'cancelled' ? 'danger' : 'primary'}
            loading={loading}
            onClick={() => handleTransition(s)}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>
    </div>
  )
}
