import { useEffect } from 'react'
import toast from 'react-hot-toast'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'
import { playMessageChime } from './notificationSound'

// Assina a tabela notifications do usuário atual via Realtime.
//
// Até 24/08 isto só reagia a 'status_updated'. Mensagem de chat gerava linha em
// notifications (fn_notify_comment_added) e ninguém olhava: o operador só
// descobria uma mensagem se abrisse a solicitação, ou pelo contador de
// não-lidas no Kanban — que não aparece no dashboard, que é onde a Mesa Central
// realmente fica.

// Notificação do sistema operacional, para quando a aba não está em foco.
//
// Só nesse caso: com a aba visível o toast já resolve, e disparar os dois seria
// o mesmo aviso duas vezes. É exatamente a situação da Mesa Central com o mapa
// aberto numa segunda janela que um toast na aba escondida nunca alcançaria.
function notifyOutsideTab(title: string, body: string, tag: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  if (!document.hidden) return

  try {
    const n = new Notification(title, {
      body,
      // tag agrupa por solicitação: dez mensagens da mesma missão substituem
      // umas às outras em vez de empilhar dez avisos.
      tag,
      renotify: true,
    } as NotificationOptions)
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Alguns navegadores exigem Service Worker para o construtor de
    // Notification. O toast já cobriu o caso; falhar aqui não pode derrubar o
    // handler de Realtime.
  }
}

export function useNotifications() {
  const userId = useAuth((s) => s.user?.id ?? null)

  useEffect(() => {
    if (!userId) return

    // Pedido de permissão silencioso. Se o navegador exigir gesto do usuário
    // ou já tiver sido negado, seguimos só com o toast — nada aqui pode virar
    // erro visível.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }

    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`notifications-web-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as {
            type: string
            title: string
            body: string
            request_id: string | null
          }

          if (n.type === 'status_updated') {
            toast(n.body, { duration: 6000, icon: '🔔' })
            return
          }

          // Canal privado do gestor (20260824000005). Mesmo tratamento da
          // mensagem de missão: quem está com o mapa aberto precisa ouvir.
          if (n.type === 'car_message') {
            toast(`${n.title}: ${n.body}`, { duration: 8000, icon: '🚗' })
            playMessageChime()
            notifyOutsideTab(n.title, n.body, 'car-chat')
            return
          }

          if (n.type === 'comment_added') {
            toast(n.body, { duration: 8000, icon: '💬' })
            // Som SEMPRE, inclusive com a aba em foco: o operador está olhando
            // o mapa, não o canto onde o toast aparece. É justamente o caso em
            // que o aviso visual passa batido.
            playMessageChime()
            notifyOutsideTab(n.title, n.body, `chat-${n.request_id ?? 'geral'}`)
          }
        },
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])
}
