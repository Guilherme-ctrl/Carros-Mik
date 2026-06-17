import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

interface AuthStore {
  user: User | null
  role: string | null
  isLoading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  role: null,
  isLoading: false,
  initialized: false,

  async signIn(email, password) {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: row } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!row) throw new Error('Acesso não configurado. Contate a Mesa Central.')

      set({ user: data.user, role: row.role })
    } finally {
      set({ isLoading: false })
    }
  },

  async signOut() {
    await supabase.auth.signOut()
    set({ user: null, role: null })
  },

  async initialize() {
    set({ isLoading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: row } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      set({ user: session.user, role: row?.role ?? null })
    } finally {
      set({ isLoading: false, initialized: true })
    }
  },
}))
