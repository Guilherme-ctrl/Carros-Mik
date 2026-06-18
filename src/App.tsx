import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CreateUserPage } from './features/admin/CreateUserPage'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { useAuth } from './features/auth/useAuth'
import { useNotifications } from './features/notifications/useNotifications'
import { CarsPage } from './features/cars/CarsPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { LeadersPage } from './features/leaders/LeadersPage'
import { KanbanPage } from './features/requests/KanbanPage'
import { NewRequestPage } from './features/requests/NewRequestPage'
import { UsersPage } from './features/users/UsersPage'
import { AppShell } from './shared/components/AppShell'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { ProtectedRoute } from './shared/components/ProtectedRoute'
import { RoleRoute } from './shared/components/RoleRoute'

function NotificationsWatcher() {
  useNotifications()
  return null
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const role = useAuth((s) => s.role)
  if (role !== 'central_admin') return <Navigate to="/requests" replace />
  return <>{children}</>
}

function DashboardRoute({ children }: { children: React.ReactNode }) {
  const role = useAuth((s) => s.role)
  if (role !== 'central_admin' && role !== 'central_operator') return <Navigate to="/requests" replace />
  return <>{children}</>
}

function CentralRoute({ children }: { children: React.ReactNode }) {
  const role = useAuth((s) => s.role)
  if (role !== 'central_admin' && role !== 'central_operator') return <Navigate to="/requests" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsWatcher />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#2D2D4E',
              color: '#F2F2F2',
              border: '1px solid #3D0A25',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#0D0D18' }, duration: 3000 },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#0D0D18' }, duration: Infinity },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><RoleRoute /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardRoute><ErrorBoundary><DashboardPage /></ErrorBoundary></DashboardRoute>} />
            <Route path="/requests" element={<ErrorBoundary><KanbanPage /></ErrorBoundary>} />
            <Route path="/requests/kanban" element={<ErrorBoundary><KanbanPage /></ErrorBoundary>} />
            <Route path="/requests/new" element={<ErrorBoundary><NewRequestPage /></ErrorBoundary>} />
            <Route path="/admin/create-user" element={<AdminRoute><ErrorBoundary><CreateUserPage /></ErrorBoundary></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><ErrorBoundary><UsersPage /></ErrorBoundary></AdminRoute>} />
            <Route path="/admin/leaders" element={<CentralRoute><ErrorBoundary><LeadersPage /></ErrorBoundary></CentralRoute>} />
            <Route path="/admin/cars" element={<CentralRoute><ErrorBoundary><CarsPage /></ErrorBoundary></CentralRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
