import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

interface NominatimAddress {
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
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 4) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: value,
          countrycodes: 'br',
          format: 'json',
          addressdetails: '1',
          limit: '6',
        })
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } },
        )
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 600)
  }

  function pickResult(result: NominatimResult) {
    const { address } = result
    const street = address.road ?? ''
    const neighborhood =
      address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district ?? ''
    onSelect({ street, neighborhood })
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
        Buscar endereço
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="address-search"
          type="text"
          autoComplete="off"
          placeholder="Digite a rua, bairro ou cidade…"
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
    </div>
  )
}
