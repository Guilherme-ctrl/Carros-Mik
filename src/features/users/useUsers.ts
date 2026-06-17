import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface UserListItem {
  id: string
  email: string
  name: string
  role: string | null
  banned: boolean
  created_at: string
}

export function useUsers() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('list-users')
      if (fnError) throw new Error(fnError.message)
      setUsers(data as UserListItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (params: {
    email: string
    password: string
    name: string
    role: string
  }) => {
    const { data, error: fnError } = await supabase.functions.invoke('create-user', {
      body: params,
    })
    if (fnError) {
      const msg = (data as { error?: string } | null)?.error ?? fnError.message
      throw new Error(msg)
    }
    return data as { id: string; email: string }
  }, [])

  const updateRole = useCallback(async (userId: string, role: string) => {
    const { data, error: fnError } = await supabase.functions.invoke('update-user-role', {
      body: { userId, role },
    })
    if (fnError) {
      const msg = (data as { error?: string } | null)?.error ?? fnError.message
      throw new Error(msg)
    }
  }, [])

  const deactivateUser = useCallback(async (userId: string, activate = false) => {
    const { data, error: fnError } = await supabase.functions.invoke('deactivate-user', {
      body: { userId, activate },
    })
    if (fnError) {
      const msg = (data as { error?: string } | null)?.error ?? fnError.message
      throw new Error(msg)
    }
  }, [])

  return { users, loading, error, getUsers, createUser, updateRole, deactivateUser }
}
