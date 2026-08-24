import { describe, it, expect } from 'vitest'
import { isAwaitingClosure } from '../awaitingClosure'

// Espelha a condição que close_request exige no banco (20260824000002). Se as
// duas se separarem, o painel passa a prometer um botão que o RPC recusa — ou
// esconde um que funcionaria.
describe('isAwaitingClosure', () => {
  it('é verdadeiro quando todos os carros ativos já reportaram', () => {
    expect(isAwaitingClosure('car_assigned', [{ outcome: 'found' }, { outcome: 'not_found' }])).toBe(true)
  })

  it('é falso enquanto faltar o desfecho de algum carro', () => {
    expect(isAwaitingClosure('car_assigned', [{ outcome: 'found' }, { outcome: null }])).toBe(false)
  })

  it('é falso sem carro nenhum — não há o que encerrar', () => {
    // Espelha a guarda v_active_count = 0 do RPC: uma missão sem carro ativo
    // volta para "open" via remove_car_from_request, não encerra.
    expect(isAwaitingClosure('car_assigned', [])).toBe(false)
  })

  it('é falso para missões que não estão em andamento', () => {
    expect(isAwaitingClosure('open', [{ outcome: 'found' }])).toBe(false)
    expect(isAwaitingClosure('completed', [{ outcome: 'found' }])).toBe(false)
    expect(isAwaitingClosure('cancelled', [{ outcome: 'found' }])).toBe(false)
  })
})
