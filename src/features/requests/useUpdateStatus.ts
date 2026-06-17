import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RequestStatus } from './useRequests'

export function useUpdateStatus() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = useCallback(async (
    requestId: string,
    newStatus: RequestStatus,
    notes?: string,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('update_request_status', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_notes: notes ?? null,
      })
      if (rpcError) throw new Error(rpcError.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateStatus, loading, error }
}
