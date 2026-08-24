import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RequestStatus } from '../requests/useRequests'

// FR7 — per-car progress, not an aggregate request-level status. FR3.3-
// equivalent web-side roster shape (unlike mobile's identification-only
// CarSummary, Mesa Central already has full `cars(*)` access today via its
// own RLS policy — ADR-8 only restricted the driver-shared read — so this
// keeps id/operational_status too, needed for CarPicker/MapPanel).
export interface AssignedCar {
  carId: string
  number: string
  pilotName: string
  copilotName: string | null
  operationalStatus: string
  status: string // request_cars.status — this car's own progress (car_assigned/on_the_way/on_site/returning)
  outcome: string | null
}

export interface RequestWithLeader {
  id: string
  leader_id: string
  leader_user_id: string
  event: string
  stage: string
  street: string
  street_number: string
  neighborhood: string
  // 20260824000006. `city` substitui o "Blumenau" que estava fixo no código de
  // navegação e de geocodificação; as coordenadas vêm da busca de endereço e
  // são nulas quando o líder digitou à mão.
  city: string | null
  latitude: number | null
  longitude: number | null
  objective: string
  maps_link: string | null
  notes: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
  leaders: { name: string; table_name: string | null; phone: string | null } | null
  cars: AssignedCar[]
}

// Raw shape of a single row from the request_cars join used below.
export interface RawRequestRow {
  id: string
  leader_id: string
  leader_user_id: string
  event: string
  stage: string
  street: string
  street_number: string
  neighborhood: string
  city: string | null
  latitude: number | null
  longitude: number | null
  objective: string
  maps_link: string | null
  notes: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
  leaders: { name: string; table_name: string | null; phone: string | null } | null
  request_cars: Array<{
    car_id: string
    status: string
    outcome: string | null
    is_current: boolean
    removed_at: string | null
    cars: { number: string; pilot_name: string; copilot_name: string | null; operational_status: string } | null
  }>
}

// Exported for unit testing (see useAllRequests.test.ts).
export function toAssignedCars(row: RawRequestRow): AssignedCar[] {
  return row.request_cars
    // is_current é correção, não filtro novo: sem ele um carro que tem esta
    // missão apenas NA FILA aparecia no dashboard como se estivesse nela. Ele
    // não está — e, desde o encerramento manual (20260824000002), contá-lo
    // aqui também travaria o botão de encerrar esperando um desfecho que uma
    // linha enfileirada nunca pode ter (FILA-ADR-6).
    .filter((rc) => rc.removed_at === null && rc.is_current && rc.cars !== null)
    .map((rc) => ({
      carId: rc.car_id,
      number: rc.cars!.number,
      pilotName: rc.cars!.pilot_name,
      copilotName: rc.cars!.copilot_name,
      operationalStatus: rc.cars!.operational_status,
      status: rc.status,
      outcome: rc.outcome,
    }))
}

export function useAllRequests() {
  const [requests, setRequests] = useState<RequestWithLeader[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAllRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // U1 (ADR-1): the car roster now comes from request_cars, filtered to
      // active (removed_at IS NULL) links — a request may have 0..N cars.
      const { data, error: dbError } = await supabase
        .from('requests')
        .select(
          `*, leaders(name, table_name, phone),
           request_cars(car_id, status, outcome, removed_at, is_current, cars(number, pilot_name, copilot_name, operational_status))`
        )
        .order('created_at', { ascending: true })
      if (dbError) throw new Error(dbError.message)
      const rows = (data ?? []) as unknown as RawRequestRow[]
      const mapped: RequestWithLeader[] = rows.map((row) => ({
        ...row,
        cars: toAssignedCars(row),
      }))
      setRequests(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar solicitações')
    } finally {
      setLoading(false)
    }
  }, [])

  return { requests, setRequests, loading, error, getAllRequests }
}
