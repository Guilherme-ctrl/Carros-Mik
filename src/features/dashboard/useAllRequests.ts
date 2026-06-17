import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RequestStatus } from '../requests/useRequests'

export interface RequestWithLeader {
  id: string
  leader_id: string
  leader_user_id: string
  event: string
  stage: string
  street: string
  street_number: string
  neighborhood: string
  objective: string
  maps_link: string | null
  notes: string | null
  status: RequestStatus
  assigned_car_id: string | null
  created_at: string
  updated_at: string
  leaders: { name: string; table_name: string | null; phone: string | null } | null
}

export function useAllRequests() {
  const [requests, setRequests] = useState<RequestWithLeader[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAllRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('requests')
        .select('*, leaders(name, table_name, phone)')
        .order('created_at', { ascending: true })
      if (dbError) throw new Error(dbError.message)
      setRequests((data ?? []) as RequestWithLeader[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar solicitações')
    } finally {
      setLoading(false)
    }
  }, [])

  return { requests, setRequests, loading, error, getAllRequests }
}
