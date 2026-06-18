import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type RequestStatus =
  | 'open'
  | 'under_review'
  | 'car_assigned'
  | 'on_the_way'
  | 'on_site'
  | 'returning'
  | 'completed'
  | 'cancelled'

export type RequestOutcome = 'found' | 'not_found'

export interface Request {
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
  outcome: RequestOutcome | null
  assigned_car_id: string | null
  created_at: string
  updated_at: string
}

export function useRequests() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMyRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { data, error: dbError } = await supabase
        .from('requests')
        .select('*')
        .eq('leader_user_id', user.id)
        .order('created_at', { ascending: false })
      if (dbError) throw new Error(dbError.message)
      setRequests(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar solicitações')
    } finally {
      setLoading(false)
    }
  }, [])

  const getAllRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (dbError) throw new Error(dbError.message)
      setRequests(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar solicitações')
    } finally {
      setLoading(false)
    }
  }, [])

  const createRequest = useCallback(async (params: {
    leader_id: string
    event: string
    stage: string
    street: string
    street_number: string
    neighborhood: string
    objective: string
    maps_link?: string | null
    notes?: string | null
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error: dbError } = await supabase.from('requests').insert({
      ...params,
      leader_user_id: user.id,
      status: 'open',
    })
    if (dbError) throw new Error(dbError.message)
  }, [])

  const cancelRequest = useCallback(async (id: string) => {
    const { error: dbError } = await supabase
      .from('requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .in('status', ['open', 'under_review'])
    if (dbError) throw new Error(dbError.message)
  }, [])

  return { requests, setRequests, loading, error, getMyRequests, getAllRequests, createRequest, cancelRequest }
}
