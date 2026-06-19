import { supabase } from '../../lib/supabase'

export async function markChatAsRead(requestId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('request_id', requestId)
    .eq('type', 'comment_added')
    .is('read_at', null)
}
