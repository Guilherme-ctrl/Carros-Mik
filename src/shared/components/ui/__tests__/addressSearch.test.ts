import { describe, expect, it } from 'vitest'
import { REGION_VIEWBOX, buildSearchParams } from '../AddressAutocompleteInput'

// Medido contra o Nominatim em 2026-08-24: sem `viewbox`+`bounded`, buscar
// "Rua XV de Novembro" devolvia Curitiba, Niterói e Osasco — nenhum resultado
// de Blumenau entre os seis primeiros. Com o recorte, os seis eram de Blumenau.
// Estes testes existem para que isso não volte por descuido.
describe('buildSearchParams', () => {
  it('prende a busca à região da gincana', () => {
    const p = buildSearchParams('Rua XV')
    expect(p.get('viewbox')).toBe(REGION_VIEWBOX)
    expect(p.get('bounded')).toBe('1')
  })

  it('a caixa cobre Blumenau e as cidades vizinhas', () => {
    const [oeste, norte, leste, sul] = REGION_VIEWBOX.split(',').map(Number)
    const dentro = (lat: number, lon: number) =>
      lon >= oeste && lon <= leste && lat <= norte && lat >= sul

    expect(dentro(-26.9194, -49.0661)).toBe(true) // Blumenau
    expect(dentro(-26.9300, -48.9600)).toBe(true) // Gaspar
    expect(dentro(-26.8990, -49.2320)).toBe(true) // Indaial
    expect(dentro(-26.8230, -49.2710)).toBe(true) // Timbó
    expect(dentro(-26.7410, -49.1780)).toBe(true) // Pomerode

    // E não pode cobrir o país inteiro, senão o recorte não recorta nada.
    expect(dentro(-25.4284, -49.2733)).toBe(false) // Curitiba
    expect(dentro(-23.5505, -46.6333)).toBe(false) // São Paulo
  })

  it('mantém os parâmetros que a busca já dependia', () => {
    const p = buildSearchParams('Rua XV')
    expect(p.get('q')).toBe('Rua XV')
    expect(p.get('countrycodes')).toBe('br')
    expect(p.get('addressdetails')).toBe('1')
  })
})
