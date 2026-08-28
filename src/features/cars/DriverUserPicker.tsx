import { useEffect, useMemo, useRef, useState } from 'react'
import type { DriverUser } from './useCars'
import { filtrarMotoristas } from './filtrarMotoristas'

interface Props {
  users: DriverUser[]
  value: string
  onChange: (userId: string) => void
  disabled?: boolean
}

const NENHUM = '— Nenhum —'

// Substitui o <select> nativo de "Motorista (app)". Com 4 motoristas o select
// resolvia; com 50+ virou uma lista de rolagem onde ninguém acha ninguém, e é
// justamente o campo cujo esquecimento produz o "Carro não configurado para
// este usuário" no app. Busca por nome OU e-mail porque a Mesa às vezes só tem
// um dos dois na mão.
export function DriverUserPicker({ users, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focado, setFocado] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selecionado = users.find((u) => u.id === value) ?? null

  const filtrados = useMemo(() => filtrarMotoristas(users, query), [users, query])

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setFocado(-1)
      }
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  function escolher(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
    setFocado(-1)
  }

  function abrir() {
    if (disabled) return
    setOpen(true)
    // O foco no input só existe depois que o painel monta.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // O CarFormModal escuta Escape no document para fechar o modal inteiro.
      // Sem barrar aqui, um Escape para sair da busca levaria junto o
      // formulário e tudo que já foi digitado. React 17+ prende os handlers no
      // container raiz, que fica abaixo do document — parar aqui basta.
      e.stopPropagation()
      setOpen(false)
      setQuery('')
      setFocado(-1)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocado((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocado((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // -1 é a linha "Nenhum", que precisa ser alcançável pelo teclado tanto
      // quanto pelo clique: é como se desfaz um vínculo errado.
      if (focado === -1) escolher('')
      else if (filtrados[focado]) escolher(filtrados[focado].id)
    }
  }

  const rotulo = selecionado
    ? `${selecionado.display_name} (${selecionado.email})`
    : NENHUM

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor="driver-user" className="text-sm font-medium text-zinc-300">
        Motorista (app) (opcional)
      </label>

      <div className="relative">
        {!open ? (
          <button
            id="driver-user"
            type="button"
            onClick={abrir}
            disabled={disabled}
            className="h-9 w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            <span className={`truncate ${selecionado ? '' : 'text-zinc-500'}`} title={rotulo}>
              {rotulo}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls="driver-user-lista"
            placeholder="Buscar por nome ou e-mail…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocado(-1) }}
            onKeyDown={handleKeyDown}
            className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}

        {open && (
          <ul
            id="driver-user-lista"
            role="listbox"
            className="absolute z-20 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
          >
            <li
              role="option"
              aria-selected={!value}
              onMouseDown={(e) => { e.preventDefault(); escolher('') }}
              onMouseEnter={() => setFocado(-1)}
              className={`cursor-pointer px-3 py-2 text-sm text-zinc-500 border-b border-zinc-800 ${focado === -1 ? 'bg-zinc-800' : ''}`}
            >
              {NENHUM}
            </li>

            {filtrados.length === 0 ? (
              <li className="px-3 py-3 text-xs text-zinc-500">
                Nenhum motorista encontrado.
              </li>
            ) : (
              filtrados.map((u, i) => (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={u.id === value}
                  onMouseDown={(e) => { e.preventDefault(); escolher(u.id) }}
                  onMouseEnter={() => setFocado(i)}
                  className={`cursor-pointer px-3 py-2 ${focado === i ? 'bg-zinc-800' : ''} ${u.id === value ? 'text-zinc-100' : 'text-zinc-300'}`}
                >
                  <p className="text-sm truncate">{u.display_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {open && (
        <p className="text-xs text-zinc-600">
          {filtrados.length} de {users.length} motorista{users.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
