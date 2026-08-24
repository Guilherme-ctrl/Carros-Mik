import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted so the spy exists before vi.mock's factory runs (vi.mock is
// hoisted above the imports).
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('../../../lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

import { addCarRpc, addCarsRpc, parseBusyConflict } from '../useAssignCar'

// ADR-4 — a busy car is never silently stolen; the web hook branches on a
// typed 'needs_confirmation' result instead of throwing, parsed from the
// RPC's named exception + DETAIL. These tests cover that parsing in
// isolation, without a live Supabase client.
//
// CORRIGIDO (achado ao vivo contra produção, 2026-08-13): DETAIL é JSON de
// verdade (`json_build_object(...)::text` na RPC), não "chave=valor". A
// versão anterior deste teste testava um formato fabricado que a RPC nunca
// produz — passava, mas não provava nada sobre o comportamento real. Os
// fixtures abaixo usam exatamente o shape confirmado contra produção:
// `{"car_id" : "...", "request_id" : "..."}`.
describe('parseBusyConflict', () => {
  it('parses car_id and request_id out of a well-formed DETAIL (formato JSON real da RPC)', () => {
    const result = parseBusyConflict({
      message: 'car_busy_needs_confirmation',
      details: '{"car_id" : "cccccccc-0000-0000-0000-00000000000a", "request_id" : "dddddddd-0000-0000-0000-000000000002"}',
    })
    expect(result).toEqual({
      status: 'needs_confirmation',
      conflictingCarId: 'cccccccc-0000-0000-0000-00000000000a',
      conflictingRequestId: 'dddddddd-0000-0000-0000-000000000002',
    })
  })

  it('returns null for an unrelated error (not a busy-car conflict)', () => {
    const result = parseBusyConflict({ message: 'Solicitação não encontrada', details: '' })
    expect(result).toBeNull()
  })

  it('returns null when the message matches but DETAIL is missing the ids', () => {
    const result = parseBusyConflict({ message: 'car_busy_needs_confirmation', details: '{}' })
    expect(result).toBeNull()
  })

  it('returns null when details is undefined entirely', () => {
    const result = parseBusyConflict({ message: 'car_busy_needs_confirmation' })
    expect(result).toBeNull()
  })

  it('returns null when details is not valid JSON (defensive, does not throw)', () => {
    const result = parseBusyConflict({ message: 'car_busy_needs_confirmation', details: 'not json at all' })
    expect(result).toBeNull()
  })

  it('parses the exact shape confirmed live against production (spaces around colons)', () => {
    const result = parseBusyConflict({
      message: 'car_busy_needs_confirmation',
      details: '{"car_id" : "d1dd7dbf-00d4-4645-9136-4e0c002cea6e", "request_id" : "7c2975cf-3b89-43e0-be17-819927e9210a"}',
    })
    expect(result).toEqual({
      status: 'needs_confirmation',
      conflictingCarId: 'd1dd7dbf-00d4-4645-9136-4e0c002cea6e',
      conflictingRequestId: '7c2975cf-3b89-43e0-be17-819927e9210a',
    })
  })
})

// FILA-ADR-4 — enqueue-vs-transfer is a p_mode parameter on the existing RPCs,
// not a new RPC. What matters is that the parameter reaches Postgres with the
// right value, and that omitting it keeps every pre-fila call site's semantics.
describe('addCarsRpc / addCarRpc — p_mode', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    rpcMock.mockResolvedValue({ error: null })
  })

  it("defaults p_mode to 'transfer' for the bulk RPC when the caller omits it", async () => {
    const result = await addCarsRpc('req-1', ['car-1', 'car-2'])

    expect(rpcMock).toHaveBeenCalledWith('add_cars_to_request', {
      p_request_id: 'req-1',
      p_car_ids: ['car-1', 'car-2'],
      p_mode: 'transfer',
    })
    expect(result).toEqual({ status: 'assigned' })
  })

  it("forwards p_mode 'enqueue' for the bulk RPC", async () => {
    await addCarsRpc('req-1', ['car-1'], 'enqueue')

    expect(rpcMock).toHaveBeenCalledWith('add_cars_to_request', {
      p_request_id: 'req-1',
      p_car_ids: ['car-1'],
      p_mode: 'enqueue',
    })
  })

  it("defaults p_mode to 'transfer' for the single-car RPC when the caller omits it", async () => {
    await addCarRpc('req-1', 'car-1')

    expect(rpcMock).toHaveBeenCalledWith('add_car_to_request', {
      p_request_id: 'req-1',
      p_car_id: 'car-1',
      p_mode: 'transfer',
    })
  })

  it("forwards p_mode 'enqueue' for the single-car RPC", async () => {
    await addCarRpc('req-1', 'car-1', 'enqueue')

    expect(rpcMock).toHaveBeenCalledWith('add_car_to_request', {
      p_request_id: 'req-1',
      p_car_id: 'car-1',
      p_mode: 'enqueue',
    })
  })

  it('still returns the typed busy conflict under transfer mode (ADR-4 path intact)', async () => {
    rpcMock.mockResolvedValue({
      error: {
        message: 'car_busy_needs_confirmation',
        details: '{"car_id" : "cccccccc-0000-0000-0000-00000000000a", "request_id" : "dddddddd-0000-0000-0000-000000000002"}',
      },
    })

    await expect(addCarRpc('req-1', 'car-1', 'transfer')).resolves.toEqual({
      status: 'needs_confirmation',
      conflictingCarId: 'cccccccc-0000-0000-0000-00000000000a',
      conflictingRequestId: 'dddddddd-0000-0000-0000-000000000002',
    })
  })

  it('throws on a genuine failure rather than returning a result', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'Missão já encerrada', details: null } })

    await expect(addCarsRpc('req-1', ['car-1'], 'enqueue')).rejects.toThrow('Missão já encerrada')
  })
})
