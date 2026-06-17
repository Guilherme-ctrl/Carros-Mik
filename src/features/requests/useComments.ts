import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/useAuth'

export interface Comment {
  id: string
  request_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

export function useComments(requestId: string | null) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const user = useAuth((s) => s.user)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const load = useCallback(async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('request_comments')
        .select('id, request_id, author_id, author_name, content, created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })
        .limit(50)
      setComments(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    if (!requestId) {
      setComments([])
      return
    }

    load()

    // Separate channel per request — independent of the status channel (spec note)
    const channel = supabase
      .channel(`comments-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_comments',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as Comment])
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [requestId, load])

  const addComment = useCallback(
    async (content: string) => {
      if (!requestId || !user || !content.trim()) return
      await supabase.from('request_comments').insert({
        request_id: requestId,
        author_id: user.id,
        content: content.trim(),
      })
    },
    [requestId, user],
  )

  return { comments, loading, addComment }
}
