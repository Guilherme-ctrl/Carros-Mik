import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type CarOperationalStatus = 'available' | 'on_mission' | 'offline' | 'unavailable'

export interface Car {
  id: string
  number: string
  pilot_name: string
  copilot_name: string | null
  pilot_phone: string
  copilot_phone: string | null
  operational_status: CarOperationalStatus
  driver_user_id: string | null
  created_at: string
  updated_at: string
}

export interface DriverUser {
  id: string
  email: string
  display_name: string
}

export function useCars() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCars = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('cars')
        .select('*')
        .order('number')
      if (dbError) throw new Error(dbError.message)
      setCars(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar carros')
    } finally {
      setLoading(false)
    }
  }, [])

  const createCar = useCallback(async (params: {
    number: string
    pilot_name: string
    copilot_name?: string | null
    pilot_phone: string
    copilot_phone?: string | null
    driver_user_id?: string | null
    operational_status?: CarOperationalStatus
  }) => {
    const { error: dbError } = await supabase.from('cars').insert(params)
    if (dbError) throw new Error(dbError.message)
  }, [])

  const updateCar = useCallback(async (id: string, params: {
    number: string
    pilot_name: string
    copilot_name?: string | null
    pilot_phone: string
    copilot_phone?: string | null
    driver_user_id?: string | null
  }) => {
    const { error: dbError } = await supabase.from('cars').update(params).eq('id', id)
    if (dbError) throw new Error(dbError.message)
  }, [])

  const updateStatus = useCallback(async (id: string, status: CarOperationalStatus) => {
    const { error: dbError } = await supabase
      .from('cars')
      .update({ operational_status: status })
      .eq('id', id)
    if (dbError) throw new Error(dbError.message)
  }, [])

  const getDriverUsers = useCallback(async (): Promise<DriverUser[]> => {
    const { data, error: dbError } = await supabase.rpc('get_driver_users')
    if (dbError) throw new Error(dbError.message)
    return (data ?? []) as DriverUser[]
  }, [])

  return { cars, setCars, loading, error, getCars, createCar, updateCar, updateStatus, getDriverUsers }
}
