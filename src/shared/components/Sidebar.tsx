import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', roles: null },
  { to: '/requests', label: 'Solicitações', roles: ['central_admin', 'central_operator'] },
  { to: '/admin/leaders', label: 'Líderes', roles: ['central_admin', 'central_operator'] },
  { to: '/admin/cars', label: 'Carros', roles: ['central_admin', 'central_operator'] },
  { to: '/admin/users', label: 'Usuários', roles: ['central_admin'] },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const role = useAuth((s) => s.role)
  const signOut = useAuth((s) => s.signOut)

  const visible = NAV.filter((item) => !item.roles || item.roles.includes(role ?? ''))

  return (
    <aside className="w-48 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800">
      <div className="px-4 py-4 border-b border-zinc-800">
        <img src="/jacare.svg" alt="Jacaré Mik Dundee" className="w-20 h-auto mb-2" />
        <span className="text-zinc-100 text-sm font-semibold">Mesa Central</span>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {visible.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                active
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={signOut}
          className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
