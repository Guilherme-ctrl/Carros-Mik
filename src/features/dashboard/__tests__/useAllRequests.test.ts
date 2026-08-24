import { describe, expect, it } from 'vitest'
import { toAssignedCars, type RawRequestRow } from '../useAllRequests'

// U1 (ADR-1) — the car roster is now a request_cars join, 0..N rows,
// filtered client-side to active (removed_at IS NULL) ones. These tests
// cover that mapping in isolation.
function baseRow(overrides: Partial<RawRequestRow> = {}): RawRequestRow {
  return {
    id: 'req-1',
    leader_id: 'leader-1',
    leader_user_id: 'user-1',
    event: 'Prova',
    stage: '1',
    street: 'Rua',
    street_number: '1',
    neighborhood: 'Centro',
    city: 'Blumenau',
    latitude: null,
    longitude: null,
    objective: 'Obj',
    maps_link: null,
    notes: null,
    status: 'car_assigned',
    created_at: '2026-08-11T10:00:00Z',
    updated_at: '2026-08-11T10:00:00Z',
    leaders: null,
    request_cars: [],
    ...overrides,
  }
}

describe('toAssignedCars', () => {
  it('maps active request_cars rows into AssignedCar view models', () => {
    const row = baseRow({
      request_cars: [
        {
          car_id: 'car-a',
          status: 'on_the_way',
          outcome: null,
          is_current: true,
          removed_at: null,
          cars: { number: 'T-A', pilot_name: 'Piloto A', copilot_name: null, operational_status: 'on_mission' },
        },
      ],
    })
    const result = toAssignedCars(row)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      carId: 'car-a',
      number: 'T-A',
      pilotName: 'Piloto A',
      copilotName: null,
      operationalStatus: 'on_mission',
      status: 'on_the_way',
      outcome: null,
    })
  })

  it('supports multiple simultaneously-active cars on one mission (FR1)', () => {
    const row = baseRow({
      request_cars: [
        { car_id: 'car-a', status: 'car_assigned', outcome: null, is_current: true, removed_at: null, cars: { number: 'T-A', pilot_name: 'A', copilot_name: null, operational_status: 'on_mission' } },
        { car_id: 'car-b', status: 'on_site', outcome: null, is_current: true, removed_at: null, cars: { number: 'T-B', pilot_name: 'B', copilot_name: null, operational_status: 'on_mission' } },
      ],
    })
    expect(toAssignedCars(row)).toHaveLength(2)
  })

  it('excludes rows with removed_at set (removed/transferred/historical)', () => {
    const row = baseRow({
      request_cars: [
        { car_id: 'car-a', status: 'returning', outcome: 'found', is_current: true, removed_at: '2026-08-11T11:00:00Z', cars: { number: 'T-A', pilot_name: 'A', copilot_name: null, operational_status: 'available' } },
      ],
    })
    expect(toAssignedCars(row)).toEqual([])
  })

  it('excludes a row whose joined car came back null (defensive — should not happen under RLS, but must not crash)', () => {
    const row = baseRow({
      request_cars: [
        { car_id: 'car-a', status: 'car_assigned', outcome: null, is_current: true, removed_at: null, cars: null },
      ],
    })
    expect(toAssignedCars(row)).toEqual([])
  })

  // Regressão da fila (FILA-ADR-1/FILA-ADR-6): uma linha enfileirada também tem
  // removed_at NULL, então sem o filtro de is_current ela aparecia no dashboard
  // como carro na missão — e, pior, travava o botão de encerrar esperando um
  // desfecho que uma linha enfileirada nunca pode receber.
  it('excludes queued rows (is_current false) — they are not on the mission yet', () => {
    const row = baseRow({
      request_cars: [
        { car_id: 'car-a', status: 'car_assigned', outcome: null, is_current: true, removed_at: null, cars: { number: 'T-A', pilot_name: 'A', copilot_name: null, operational_status: 'on_mission' } },
        { car_id: 'car-b', status: 'car_assigned', outcome: null, is_current: false, removed_at: null, cars: { number: 'T-B', pilot_name: 'B', copilot_name: null, operational_status: 'on_mission' } },
      ],
    })
    const result = toAssignedCars(row)
    expect(result).toHaveLength(1)
    expect(result[0].number).toBe('T-A')
  })

  it('returns an empty array for a request with no assigned cars (status open)', () => {
    expect(toAssignedCars(baseRow({ status: 'open', request_cars: [] }))).toEqual([])
  })
})
