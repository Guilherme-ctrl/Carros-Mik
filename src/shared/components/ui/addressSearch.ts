// Parâmetros da busca de endereço, separados do componente.
//
// Ficavam exportados de AddressAutocompleteInput.tsx, o que quebra o Fast
// Refresh (um arquivo de componente só deve exportar componentes) — e, mais
// importante, deixava a regra de recorte enterrada dentro da UI.

// Caixa que cobre Blumenau e as cidades vizinhas onde a gincana acontece
// (Gaspar, Indaial, Timbó, Pomerode), com folga nas bordas.
// Formato do Nominatim: <oeste>,<norte>,<leste>,<sul>.
export const REGION_VIEWBOX = '-49.40,-26.65,-48.85,-27.15'

// Medido contra o Nominatim em 2026-08-24: sem viewbox+bounded, buscar "Rua XV
// de Novembro" devolvia Curitiba, Niterói e Osasco — nenhum resultado de
// Blumenau entre os seis primeiros.
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
