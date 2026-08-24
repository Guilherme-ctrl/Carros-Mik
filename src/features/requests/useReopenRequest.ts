import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export interface ReopenResult {
  restored: string[]
  unavailable: string[]
}

// Reabrir missão (RPC reopen_request, 20260824000004).
//
// O RPC devolve DUAS listas porque a devolução é melhor esforço: encerrar solta
// os carros, e soltar faz a fila de cada um avançar — quando a missão reabre,
// um carro dela pode já estar em outra. Quem reabre precisa saber com quem
// ficou, senão fica achando que a guarnição inteira voltou.
export async function reopenRequestRpc(requestId: string): Promise<ReopenResult> {
  const { data, error } = await supabase.rpc('reopen_request', { p_request_id: requestId })
  if (error) throw error

  // RETURNS TABLE chega como array de linhas; esta função devolve exatamente uma.
  const row = (Array.isArray(data) ? data[0] : data) as {
    restored_car_numbers: string[] | null
    unavailable_car_numbers: string[] | null
  } | undefined

  return {
    restored: row?.restored_car_numbers ?? [],
    unavailable: row?.unavailable_car_numbers ?? [],
  }
}

export function useReopenRequest() {
  const [loading, setLoading] = useState(false)

  async function reopen(requestId: string): Promise<boolean> {
    setLoading(true)
    try {
      const { restored, unavailable } = await reopenRequestRpc(requestId)

      if (restored.length === 0) {
        // Nenhum carro de volta significa que a missão voltou para a fila de
        // despacho. Dizer só "reaberta" deixaria a Mesa Central esperando um
        // carro que não vem.
        toast.success('Missão reaberta. Nenhum carro pôde voltar — reatribua.', { duration: 8000 })
      } else if (unavailable.length > 0) {
        toast.success(
          `Missão reaberta com ${restored.join(', ')}. ` +
          `Já em outra missão: ${unavailable.join(', ')}.`,
          { duration: 8000 },
        )
      } else {
        toast.success(`Missão reaberta com ${restored.join(', ')}`)
      }
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reabrir a missão')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { reopen, loading }
}
