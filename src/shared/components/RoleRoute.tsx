import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

export function RoleRoute() {
  const role = useAuth((s) => s.role)

  if (role === 'central_admin' || role === 'central_operator') {
    return <Navigate to="/dashboard" replace />
  }

  if (role === 'table_leader') {
    return <Navigate to="/requests" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <p className="text-red-400 text-center">
        Acesso não configurado. Contate a Mesa Central.
      </p>
    </div>
  )
}
