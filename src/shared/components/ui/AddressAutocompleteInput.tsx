import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

interface NominatimAddress {
  house_number?: string
  road?: string
  suburb?: string
  neighbourhood?: string
  quarter?: string
  city_district?: string
  city?: string
  town?: string
  village?: string
  state?: string
}

interface NominatimResult {
  place_id: number
  display_name: string
  address: NominatimAddress
}

interface AddressData {
  street: string
  neighborhood: string
  // Presente só quando o líder digita o número junto ("Rua XV 100"). O
  // Nominatim não inventa número, então na maior parte das buscas isto vem
  // vazio e o campo Número segue sendo preenchido à mão — foi por isso que os
  // campos abaixo do autocomplete nunca puderam ser escondidos.
  houseNumber?: string
}

// Caixa que cobre Blumenau e as cidades vizinhas onde a gincana acontece
// (Gaspar, Indaial, Timbó, Pomerode), com folga nas bordas.
// Formato do Nominatim: <oeste>,<norte>,<leste>,<sul>.
export const REGION_VIEWBOX = '-49.40,-26.65,-48.85,-27.15'

// Exportada para o teste conseguir travar o recorte. Sem ele, alguém remove o
// `bounded` numa refatoração e a busca volta a devolver Curitiba — que foi
// exatamente o que a queixa de "difícil preencher o endereço" era.
export function buildSearchParams(query: string): URLSearchParams {
  return new URLSearchParams({
    q: query,
    countrycodes: 'br',
    format: 'json',
    addressdetails: '1',
    limit: '6',
    viewbox: REGION_VIEWBOX,
    bounded: '1',
  })
}

interface Props {
  onSelect: (data: AddressData) => void
  error?: string
  disabled?: boolean
}

function shortLabel(result: NominatimResult): string {
  const { address } = result
  const parts: string[] = []
  if (address.road) parts.push(address.road)
  const hood = address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district
  if (hood) parts.push(hood)
  const city = address.city ?? address.town ?? address.village
  if (city) parts.push(city)
  if (address.state) parts.push(address.state)
  return parts.join(', ') || result.display_name
}

export function AddressAutocompleteInput({ onSelect, error, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cancela a busca anterior quando outra começa. Sem isto, uma resposta lenta
  // de "rua x" pode chegar DEPOIS da resposta de "rua xv" e sobrescrever a
  // lista com o resultado mais velho — o líder vê sugestões que não
  // correspondem ao que está escrito.
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    setFocusedIndex(-1)
    setSearchError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // 3 caracteres, não 4: "Rua" e nomes curtos como "XV" ficavam de fora.
    if (value.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    // 350ms em vez de 600: no celular a espera anterior parecia travamento.
    // A busca só dispara na pausa da digitação, então isso não vira uma
    // rajada de requisições.
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        // A correção que mais pesa. Antes a busca era o Brasil inteiro, e
        // "Rua XV de Novembro" existe em quase toda cidade brasileira: medido
        // contra o Nominatim, os 6 primeiros resultados vinham de Curitiba,
        // Niterói e Osasco — nenhum de Blumenau.
        const params = buildSearchParams(value)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
            signal: controller.signal,
          },
        )

        // O código anterior não olhava o status: um 429 (o Nominatim limita a
        // ~1 busca por segundo) ou um 403 caía no catch e fechava o dropdown
        // em silêncio. O líder digitava e não acontecia NADA — sem erro, sem
        // pista, sem saber que era só esperar ou digitar embaixo. É a metade
        // da queixa "difícil preencher o endereço".
        if (!res.ok) {
          setResults([])
          setOpen(false)
          setSearchError(
            res.status === 429
              ? 'Busca ocupada. Espere um instante ou preencha os campos abaixo.'
              : 'Busca indisponível. Preencha os campos abaixo.',
          )
          return
        }

        const data: NominatimResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
        setSearchError(
          data.length === 0
            ? 'Nenhum endereço encontrado por aqui. Preencha os campos abaixo.'
            : null,
        )
      } catch (err) {
        // Aborto não é falha: é a busca anterior sendo descartada de propósito.
        if (err instanceof DOMException && err.name === 'AbortError') return
        setResults([])
        setOpen(false)
        setSearchError('Sem conexão com a busca. Preencha os campos abaixo.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)
  }

  function pickResult(result: NominatimResult) {
    const { address } = result
    const street = address.road ?? ''
    const neighborhood =
      address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district ?? ''
    onSelect({ street, neighborhood, houseNumber: address.house_number })
    setQuery(shortLabel(result))
    setOpen(false)
    setFocusedIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      pickResult(results[focusedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label htmlFor="address-search" className="text-sm font-medium text-on-surface-muted">
        Buscar endereço <span className="text-on-surface-disabled font-normal">(opcional)</span>
      </label>
      {/* Dizer que é opcional resolve a dúvida que os campos abaixo criam: o
          líder não sabia se a busca era obrigatória, e travava nela quando ela
          não achava o endereço em vez de simplesmente digitar. */}
      <div className="relative">
        <input
          ref={inputRef}
          id="address-search"
          type="text"
          autoComplete="off"
          placeholder="Ex: Rua XV de Novembro 100"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'h-10 w-full rounded-lg border bg-surface-2 px-3 pr-8 text-sm text-on-surface placeholder:text-on-surface-disabled transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent',
            error
              ? 'border-status-unavailable'
              : 'border-surface-3 hover:border-on-surface-disabled',
          )}
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-disabled text-xs animate-pulse">
            …
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-surface-3 bg-surface-1 shadow-xl overflow-hidden">
          {results.map((r, idx) => (
            <li
              key={r.place_id}
              onMouseDown={() => pickResult(r)}
              className={cn(
                'px-3 py-2.5 text-sm text-on-surface cursor-pointer truncate transition-colors',
                idx === focusedIndex ? 'bg-surface-3' : 'hover:bg-surface-2',
              )}
            >
              {shortLabel(r)}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-status-unavailable">{error}</p>}

      {/* Aviso, não erro: a busca falhar não impede o líder de seguir — e a
          mensagem sempre aponta a saída (os campos logo abaixo). */}
      {!error && searchError && (
        <p className="text-xs text-status-busy">{searchError}</p>
      )}
    </div>
  )
}
