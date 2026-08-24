import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

// "Cutucar": a Mesa Central toca o ombro de um carro (RPC nudge_car,
// 20260824000003). Serve para o carro que sumiu do rádio ou que não responde
// no chat — o push chega mesmo com o app fechado.
//
// O RPC tem freio de 30s por carro e recusa com uma mensagem legível; ela vai
// inteira para a tela, porque "já foi cutucado há pouco" é informação útil,
// não erro genérico.
// Exportada à parte do hook pelo mesmo motivo que addCarRpc em useAssignCar:
// é o pedaço que carrega contrato com o banco (nome do RPC e dos parâmetros) e
// dá para cobrir sem montar React.
export async function nudgeCarRpc(carId: string, requestId?: string): Promise<void> {
  const { error } = await supabase.rpc('nudge_car', {
    p_car_id: carId,
    p_request_id: requestId ?? null,
  })
  if (error) throw error
}

export function useNudgeCar() {
  const [nudgingCarId, setNudgingCarId] = useState<string | null>(null)

  async function nudge(carId: string, carNumber: string, requestId?: string) {
    setNudgingCarId(carId)
    try {
      await nudgeCarRpc(carId, requestId)
      toast.success(`Carro ${carNumber} cutucado`, { icon: '👉' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível cutucar')
    } finally {
      setNudgingCarId(null)
    }
  }

  return { nudge, nudgingCarId }
}
