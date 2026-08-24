import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('../../../lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

import { nudgeCarRpc } from '../useNudgeCar'
import { closeRequestRpc } from '../../requests/useCloseRequest'
import { reopenRequestRpc } from '../../requests/useReopenRequest'

// Contrato com o banco: nome do RPC e nome dos parâmetros. Um erro de digitação
// aqui só apareceria como 404 do PostgREST em produção, no meio do evento.
describe('nudgeCarRpc', () => {
  beforeEach(() => rpcMock.mockReset())

  it('chama nudge_car com p_car_id e p_request_id', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await nudgeCarRpc('car-1', 'req-1')
    expect(rpcMock).toHaveBeenCalledWith('nudge_car', {
      p_car_id: 'car-1',
      p_request_id: 'req-1',
    })
  })

  it('manda p_request_id null quando o cutucão não é sobre uma missão', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await nudgeCarRpc('car-1')
    expect(rpcMock).toHaveBeenCalledWith('nudge_car', {
      p_car_id: 'car-1',
      p_request_id: null,
    })
  })

  // O freio de 30s do RPC volta como erro, e a mensagem dele precisa chegar ao
  // operador — "já foi cutucado há pouco" é resposta, não falha.
  it('propaga a recusa do freio de 30s', async () => {
    rpcMock.mockResolvedValue({
      error: new Error('Carro 12 já foi cutucado nos últimos 30 segundos'),
    })
    await expect(nudgeCarRpc('car-1')).rejects.toThrow(/30 segundos/)
  })
})

describe('closeRequestRpc', () => {
  beforeEach(() => rpcMock.mockReset())

  it('chama close_request com p_request_id', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await closeRequestRpc('req-1')
    expect(rpcMock).toHaveBeenCalledWith('close_request', { p_request_id: 'req-1' })
  })

  it('propaga a recusa de "ainda falta o desfecho"', async () => {
    rpcMock.mockResolvedValue({
      error: new Error('Ainda falta o desfecho do(s) carro(s): 12, 15'),
    })
    await expect(closeRequestRpc('req-1')).rejects.toThrow(/falta o desfecho/)
  })
})

describe('reopenRequestRpc', () => {
  beforeEach(() => rpcMock.mockReset())

  // RETURNS TABLE volta como array de linhas. Ler isto errado (tratar como
  // objeto) faria as duas listas virem vazias e a tela diria "nenhum carro
  // voltou" mesmo quando todos voltaram.
  it('desembrulha a linha do RETURNS TABLE', async () => {
    rpcMock.mockResolvedValue({
      data: [{ restored_car_numbers: ['R-B'], unavailable_car_numbers: ['R-A'] }],
      error: null,
    })
    await expect(reopenRequestRpc('req-1')).resolves.toEqual({
      restored: ['R-B'],
      unavailable: ['R-A'],
    })
  })

  it('trata listas nulas como vazias', async () => {
    rpcMock.mockResolvedValue({
      data: [{ restored_car_numbers: null, unavailable_car_numbers: null }],
      error: null,
    })
    await expect(reopenRequestRpc('req-1')).resolves.toEqual({
      restored: [],
      unavailable: [],
    })
  })

  it('propaga a recusa de missão não encerrada', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: new Error('Só é possível reabrir uma missão encerrada (esta está: open)'),
    })
    await expect(reopenRequestRpc('req-1')).rejects.toThrow(/reabrir uma missão encerrada/)
  })
})
