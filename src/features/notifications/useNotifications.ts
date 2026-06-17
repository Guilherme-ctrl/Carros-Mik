import { useEffect } from 'react'
import toast from 'react-hot-toast'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'

// Subscribes to the notifications table for the current user via Realtime.
// On a new status_updated notification: shows a react-hot-toast.
export function useNotifications() {
  const userId = useAuth((s) => s.user?.id ?? null)

  useEffect(() => {
    if (!userId) return

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
          const n = payload.new as { type: string; title: string; body: string }
          if (n.type === 'status_updated') {
            toast(n.body, {
              duration: 6000,
              icon: '🔔',
            })
          }
        },
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])
}
