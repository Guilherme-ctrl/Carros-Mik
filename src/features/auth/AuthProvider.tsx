import { useEffect, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialize = useAuth((s) => s.initialize)

  useEffect(() => {
    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        useAuth.setState({ user: null, role: null })
      }
    })

    return () => subscription.unsubscribe()
  }, [initialize])

  return <>{children}</>
}
