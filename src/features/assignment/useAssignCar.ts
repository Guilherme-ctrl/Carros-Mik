import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function useAssignCar() {
  const [loading, setLoading] = useState(false)

  const assignCar = useCallback(async (requestId: string, carId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('assign_car_to_request', {
        p_request_id: requestId,
        p_car_id: carId,
      })
      if (error) throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reassignCar = useCallback(async (requestId: string, newCarId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('reassign_car', {
        p_request_id: requestId,
        p_new_car_id: newCarId,
      })
      if (error) throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { assignCar, reassignCar, loading }
}
