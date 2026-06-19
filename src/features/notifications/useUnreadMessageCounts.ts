import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'

type Counts = Record<string, number>

export function useUnreadMessageCounts(): Counts {
  const userId = useAuth((s) => s.user?.id ?? null)
  const [counts, setCounts] = useState<Counts>({})

  useEffect(() => {
    if (!userId) return

    supabase
      .from('notifications')
      .select('request_id')
      .eq('user_id', userId)
      .eq('type', 'comment_added')
      .is('read_at', null)
      .then(({ data }) => {
        if (!data) return
        const initial: Counts = {}
        for (const row of data) {
          if (row.request_id) {
            initial[row.request_id] = (initial[row.request_id] ?? 0) + 1
          }
        }
        setCounts(initial)
      })

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as { type: string; request_id: string | null }
          if (n.type === 'comment_added' && n.request_id) {
            setCounts((prev) => ({
              ...prev,
              [n.request_id!]: (prev[n.request_id!] ?? 0) + 1,
            }))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const old = payload.old as { type?: string; read_at?: string | null; request_id?: string | null }
          const updated = payload.new as { type: string; read_at: string | null; request_id: string | null }
          if (
            updated.type === 'comment_added' &&
            updated.read_at &&
            !old.read_at &&
            updated.request_id
          ) {
            setCounts((prev) => ({
              ...prev,
              [updated.request_id!]: Math.max(0, (prev[updated.request_id!] ?? 0) - 1),
            }))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return counts
}
