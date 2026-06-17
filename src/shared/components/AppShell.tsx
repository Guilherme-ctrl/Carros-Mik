import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { Sidebar } from './Sidebar'

const NAV = [
  { to: '/dashboard',     label: 'Dashboard', roles: null },
  { to: '/admin/leaders', label: 'Líderes',   roles: ['central_admin', 'central_operator'] },
  { to: '/admin/cars',    label: 'Carros',    roles: ['central_admin', 'central_operator'] },
  { to: '/admin/users',   label: 'Usuários',  roles: ['central_admin'] },
]

function MobileNav() {
  const { pathname } = useLocation()
  const role = useAuth((s) => s.role)
  const signOut = useAuth((s) => s.signOut)
  const visible = NAV.filter((item) => !item.roles || item.roles.includes(role ?? ''))

  return (
    <nav className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
      {visible.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + '/')
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-lg transition-colors ${
              active
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
      <button
        onClick={signOut}
        className="ml-auto whitespace-nowrap px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
      >
        Sair
      </button>
    </nav>
  )
}

export function AppShell() {
  return (
    <div className="h-screen flex bg-zinc-950">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex lg:hidden items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 h-11 shrink-0">
          <span className="text-zinc-100 text-xs font-semibold shrink-0">Mesa Central</span>
          <MobileNav />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
