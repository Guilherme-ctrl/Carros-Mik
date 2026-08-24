import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted so the spy exists before vi.mock's factory runs (vi.mock is
// hoisted above the imports).
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))
vi.mock('../../../lib/supabase', () => ({ supabase: { rpc: rpcMock } }))

import { toQueueByCarId, useFleetQueue, type RawFleetQueueRow } from '../useFleetQueue'

// US7/US8 — the fleet queue store. zustand keeps the state outside React, so
// the real store (not a re-implementation) is exercised here without a
// renderer, matching this package's hook-only test convention.

const ROW_WITH_QUEUE: RawFleetQueueRow = {
  car_id: 'car-1',
  queue_count: 2,
  is_stranded: true,
  items: [
    { request_id: 'req-a', priority: 'alta', label: 'Prova do Bolo' },
    { request_id: 'req-b', priority: 'normal', label: 'Coleta de Latas' },
  ],
}

const ROW_EMPTY: RawFleetQueueRow = {
  car_id: 'car-2',
  queue_count: 0,
  is_stranded: false,
  items: [],
}

describe('toQueueByCarId', () => {
  it('indexes the RPC array by car id and converts snake_case to camelCase', () => {
    const map = toQueueByCarId([ROW_WITH_QUEUE, ROW_EMPTY])

    expect(Object.keys(map)).toEqual(['car-1', 'car-2'])
    expect(map['car-1']).toEqual({
      carId: 'car-1',
      queueCount: 2,
      isStranded: true,
      items: [
        { requestId: 'req-a', priority: 'alta', label: 'Prova do Bolo' },
        { requestId: 'req-b', priority: 'normal', label: 'Coleta de Latas' },
      ],
    })
  })

  it('leaves no snake_case key on the mapped entry or its items', () => {
    const entry = toQueueByCarId([ROW_WITH_QUEUE])['car-1']
    const keys = [...Object.keys(entry), ...Object.keys(entry.items[0])]
    expect(keys.some((k) => k.includes('_'))).toBe(false)
  })

  it('preserves the server-side order (priority DESC) instead of re-sorting', () => {
    const entry = toQueueByCarId([ROW_WITH_QUEUE])['car-1']
    expect(entry.items.map((i) => i.requestId)).toEqual(['req-a', 'req-b'])
  })

  it('tolerates a null items payload for an empty-queue car', () => {
    const map = toQueueByCarId([{ ...ROW_EMPTY, items: null }])
    expect(map['car-2'].items).toEqual([])
    expect(map['car-2'].queueCount).toBe(0)
  })
})

describe('useFleetQueue store', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    useFleetQueue.setState({ queueByCarId: {}, loading: false, error: null })
  })

  it('getOverview populates queueByCarId from get_fleet_queue_overview', async () => {
    rpcMock.mockResolvedValue({ data: [ROW_WITH_QUEUE, ROW_EMPTY], error: null })

    await useFleetQueue.getState().getOverview()

    expect(rpcMock).toHaveBeenCalledWith('get_fleet_queue_overview')
    expect(useFleetQueue.getState().queueByCarId['car-1'].queueCount).toBe(2)
    expect(useFleetQueue.getState().queueByCarId['car-2'].isStranded).toBe(false)
    expect(useFleetQueue.getState().error).toBeNull()
  })

  it('getOverview surfaces an RPC failure instead of swallowing it, keeping the last good data', async () => {
    rpcMock.mockResolvedValue({ data: [ROW_WITH_QUEUE], error: null })
    await useFleetQueue.getState().getOverview()

    rpcMock.mockResolvedValue({ data: null, error: { message: 'Não autorizado' } })
    await useFleetQueue.getState().getOverview()

    expect(useFleetQueue.getState().error).toBe('Não autorizado')
    // Stale-but-real beats blanked-out: the previous overview stays rendered.
    expect(useFleetQueue.getState().queueByCarId['car-1'].queueCount).toBe(2)
    expect(useFleetQueue.getState().loading).toBe(false)
  })

  it('setPriority re-reads only AFTER the write resolves (pessimistic, Q2=A)', async () => {
    let resolveWrite: (value: { error: null }) => void = () => {}
    rpcMock.mockImplementation((fn: string) => {
      if (fn === 'set_request_priority') {
        return new Promise<{ error: null }>((resolve) => { resolveWrite = resolve })
      }
      return Promise.resolve({
        data: [{ ...ROW_WITH_QUEUE, items: [{ request_id: 'req-b', priority: 'alta', label: 'Coleta de Latas' }] }],
        error: null,
      })
    })

    const pending = useFleetQueue.getState().setPriority('req-b', 'alta')
    await Promise.resolve()

    // The write is still in flight — no refetch may have started yet.
    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual(['set_request_priority'])
    expect(rpcMock).toHaveBeenCalledWith('set_request_priority', {
      p_request_id: 'req-b',
      p_priority: 'alta',
    })

    resolveWrite({ error: null })
    await pending

    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual([
      'set_request_priority',
      'get_fleet_queue_overview',
    ])
    // State moved only because the re-read confirmed it — never optimistically.
    expect(useFleetQueue.getState().queueByCarId['car-1'].items[0].priority).toBe('alta')
  })

  it('setPriority rejects and skips the refetch when the write fails', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'Não autorizado' } })

    await expect(useFleetQueue.getState().setPriority('req-b', 'baixa')).rejects.toThrow('Não autorizado')

    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual(['set_request_priority'])
    expect(useFleetQueue.getState().loading).toBe(false)
  })

  it('setPriority rejects when the confirming re-read fails, rather than reporting success', async () => {
    rpcMock.mockImplementation((fn: string) =>
      fn === 'set_request_priority'
        ? Promise.resolve({ error: null })
        : Promise.resolve({ data: null, error: { message: 'timeout' } }),
    )

    await expect(useFleetQueue.getState().setPriority('req-b', 'baixa')).rejects.toThrow('timeout')
    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual([
      'set_request_priority',
      'get_fleet_queue_overview',
    ])
  })
})
