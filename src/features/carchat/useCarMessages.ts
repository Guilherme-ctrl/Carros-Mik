import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'

export interface CarMessage {
  id: string
  car_id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  created_at: string
}

// Canal privado do gestor com UM carro.
//
// Um canal de Realtime por carro, com filtro no servidor: o gestor abre uma
// conversa por vez, e assinar a tabela inteira traria mensagens de carros que
// não estão na tela (a RLS as esconde na leitura, mas o payload de Realtime
// ainda viria e faria o componente trabalhar à toa).
export function useCarMessages(carId: string | null) {
  // Carro e mensagens no MESMO estado, de propósito.
  //
  // Guardar `messages` solto obrigaria a limpá-las no efeito ao trocar de
  // carro — um setState síncrono dentro do effect, que dispara renderização em
  // cascata (e o lint reclama com razão). Mantendo os dois juntos, "de qual
  // carro são estas mensagens" é um dado, não um efeito colateral: enquanto o
  // carregamento do carro novo não termina, `state.carId` ainda é o antigo e a
  // lista derivada sai vazia sozinha.
  const [state, setState] = useState<{ carId: string | null; items: CarMessage[] }>({
    carId: null,
    items: [],
  })
  const userId = useAuth((s) => s.user?.id ?? null)

  const messages = state.carId === carId ? state.items : []
  const loading = carId !== null && state.carId !== carId

  useEffect(() => {
    if (!carId) return

    let cancelled = false

    // O primeiro setState só acontece DEPOIS do await — nunca no corpo síncrono
    // do efeito.
    void (async () => {
      const { data } = await supabase
        .from('car_messages')
        .select('id, car_id, author_id, author_name, author_role, content, created_at')
        .eq('car_id', carId)
        .order('created_at', { ascending: true })
        .limit(200)
      // Troca rápida de carro: a resposta lenta do anterior não pode sobrescrever.
      if (cancelled) return
      setState({ carId, items: data ?? [] })
    })()

    // Um canal por carro, com filtro no servidor: o gestor abre uma conversa
    // por vez, e assinar a tabela inteira traria payloads de carros fora da
    // tela (a RLS os esconde na leitura, mas o evento ainda chegaria).
    const channel = supabase
      .channel(`car-messages-${carId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'car_messages',
          filter: `car_id=eq.${carId}`,
        },
        (payload) => {
          const incoming = payload.new as CarMessage
          setState((prev) => {
            if (prev.carId !== incoming.car_id) return prev
            // A mensagem recém-enviada pode já ter entrado por outro caminho.
            if (prev.items.some((m) => m.id === incoming.id)) return prev
            return { ...prev, items: [...prev.items, incoming] }
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [carId])

  const send = useCallback(
    async (content: string) => {
      if (!carId || !userId || !content.trim()) return
      const { error } = await supabase.from('car_messages').insert({
        car_id: carId,
        author_id: userId,
        content: content.trim(),
      })
      if (error) throw error
    },
    [carId, userId],
  )

  return { messages, loading, send }
}
