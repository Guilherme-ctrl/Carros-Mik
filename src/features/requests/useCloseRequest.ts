import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

// Encerramento manual da missão (migration 20260824000002).
//
// Existe porque reportar "Achei"/"Não achei" parou de encerrar: o desfecho de
// cada carro é só um registro, e a missão fecha aqui. Mesa Central, Líder da
// mesa e chefe de carro podem chamar — a autorização é do RPC, não desta tela.
export function useCloseRequest() {
  const [loading, setLoading] = useState(false)

  async function closeRequest(requestId: string): Promise<boolean> {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('close_request', { p_request_id: requestId })
      if (error) throw error
      toast.success('Missão encerrada')
      return true
    } catch (err) {
      // As recusas do RPC são escritas para serem lidas por quem está operando
      // ("Ainda falta o desfecho do(s) carro(s): 12, 15"), então a mensagem vai
      // inteira para a tela em vez de virar um genérico "erro ao encerrar".
      const msg = err instanceof Error ? err.message : 'Erro ao encerrar a missão'
      toast.error(msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { closeRequest, loading }
}
