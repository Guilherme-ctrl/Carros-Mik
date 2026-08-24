import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { useEventExport } from '../../features/admin/useEventExport'

const CENTRAL_ROLES = new Set(['central_admin', 'central_operator'])

const NAV = [
  { to: '/dashboard', label: 'Dashboard', roles: ['central_admin', 'central_operator'] },
  { to: '/requests', label: 'Solicitações', roles: ['central_admin', 'central_operator', 'table_leader'] },
  { to: '/admin/leaders', label: 'Líderes', roles: ['central_admin', 'central_operator'] },
  { to: '/admin/cars', label: 'Carros', roles: ['central_admin', 'central_operator'] },
  { to: '/admin/chat', label: 'Chat dos Carros', roles: ['central_admin'] },
  { to: '/admin/users', label: 'Usuários', roles: ['central_admin'] },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const role = useAuth((s) => s.role)
  const signOut = useAuth((s) => s.signOut)
  const { exportEvent, loading: exporting } = useEventExport()

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

      {/* Fica na barra lateral, e não escondido dentro de uma página de admin,
          porque o momento de usar é o pior momento possível para procurar: o
          sistema instável, e a planilha precisando ser baixada ANTES de cair.
          Um clique, de qualquer tela. */}
      {CENTRAL_ROLES.has(role ?? '') && (
        <div className="p-2 border-t border-zinc-800">
          <button
            onClick={exportEvent}
            disabled={exporting}
            title="Baixa uma planilha com missões, fila, carros, líderes e mensagens"
            className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exportando…' : 'Baixar planilha'}
          </button>
        </div>
      )}

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
