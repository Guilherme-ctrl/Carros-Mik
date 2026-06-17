import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface CarLocation {
  id: string
  car_id: string
  latitude: number
  longitude: number
  accuracy: number | null
  recorded_at: string
}

export function useCarLocations() {
  const [locations, setLocations] = useState<CarLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getLocations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('car_locations')
        .select('*')
      if (dbError) throw new Error(dbError.message)
      setLocations(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar localizações')
    } finally {
      setLoading(false)
    }
  }, [])

  return { locations, setLocations, loading, error, getLocations }
}
