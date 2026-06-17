import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user)
  const isLoading = useAuth((s) => s.isLoading)
  const initialized = useAuth((s) => s.initialized)

  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
