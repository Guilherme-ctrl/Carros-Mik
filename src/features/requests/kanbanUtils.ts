import type { RequestStatus } from './useRequests'

export function getKanbanColumn(status: RequestStatus): 'todo' | 'doing' | 'done' {
  if (status === 'open' || status === 'under_review') return 'todo'
  if (status === 'completed' || status === 'cancelled') return 'done'
  return 'doing'
}
