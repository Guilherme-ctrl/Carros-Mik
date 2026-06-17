import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface Leader {
  id: string
  name: string
  table_name: string | null
  phone: string
  is_active: boolean
  created_at: string
}

interface UseLeadersOptions {
  activeOnly?: boolean
}

export function useLeaders(options: UseLeadersOptions = {}) {
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getLeaders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('leaders')
        .select('id, name, table_name, phone, is_active, created_at')
        .order('name')

      if (options.activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error: dbError } = await query
      if (dbError) throw new Error(dbError.message)
      setLeaders(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar líderes')
    } finally {
      setLoading(false)
    }
  }, [options.activeOnly])

  const createLeader = useCallback(async (params: {
    name: string
    table_name?: string | null
    phone: string
  }) => {
    const { error: dbError } = await supabase.from('leaders').insert(params)
    if (dbError) throw new Error(dbError.message)
  }, [])

  const updateLeader = useCallback(async (id: string, params: {
    name: string
    table_name?: string | null
    phone: string
  }) => {
    const { error: dbError } = await supabase.from('leaders').update(params).eq('id', id)
    if (dbError) throw new Error(dbError.message)
  }, [])

  const toggleActive = useCallback(async (id: string, currentValue: boolean) => {
    const { error: dbError } = await supabase
      .from('leaders')
      .update({ is_active: !currentValue })
      .eq('id', id)
    if (dbError) throw new Error(dbError.message)
  }, [])

  return { leaders, loading, error, getLeaders, createLeader, updateLeader, toggleActive }
}
