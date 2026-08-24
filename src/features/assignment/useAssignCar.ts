import { useCallback, useState } from 'react'
import { supabase } from '../../lib/supabase'

// ADR-4 — a busy car is never silently stolen. addCars/addCar return a typed
// result instead of throwing when the target car needs a transfer
// confirmation; only a genuine failure (network, validation) throws.
export type AssignResult =
  | { status: 'assigned' }
  | { status: 'needs_confirmation'; conflictingCarId: string; conflictingRequestId: string }

// FILA-ADR-4 — enqueue-vs-transfer is a PARAMETER of the existing RPCs, not a
// new RPC. Mirrors the Postgres enum request_car_assign_mode.
//   'transfer' — a busy car raises car_busy_needs_confirmation (the flow that
//                already existed); the caller must confirm before it moves.
//   'enqueue'  — a busy car takes the mission into its queue instead, and its
//                current mission is left completely alone (BR2: never raises).
// A FREE car is assigned outright under either mode.
export type AssignMode = 'enqueue' | 'transfer'

// Exported for unit testing (see useAssignCar.test.ts) — the DETAIL parsing
// is the one piece of this hook worth testing in isolation, independent of a
// live Supabase client.
//
// CORRIGIDO (achado ao vivo contra produção, 2026-08-13): a versão anterior
// tentava casar DETAIL com uma regex de chave=valor ("car_id=<uuid>
// request_id=<uuid>"), mas a RPC monta DETAIL com `json_build_object(...)::text`
// — ou seja, DETAIL é JSON de verdade: `{"car_id" : "...", "request_id" : "..."}`.
// A regex nunca casava com isso, então esta função sempre devolvia null e o
// fluxo de confirmação de transferência nunca funcionava. `useAssignCar.test.ts`
// não pegou isso porque testava com um DETAIL fabricado no formato errado —
// nunca contra a saída real da RPC. Corrigido pra fazer parse de JSON de
// verdade em vez de regex frágil.
export function parseBusyConflict(error: { message: string; details?: string | null }): AssignResult | null {
  if (!error.message.includes('car_busy_needs_confirmation')) return null
  if (!error.details) return null
  try {
    const parsed = JSON.parse(error.details) as { car_id?: string; request_id?: string }
    if (!parsed.car_id || !parsed.request_id) return null
    return {
      status: 'needs_confirmation',
      conflictingCarId: parsed.car_id,
      conflictingRequestId: parsed.request_id,
    }
  } catch {
    return null
  }
}

// Exported for unit testing (see useAssignCar.test.ts) — the hook body below is
// only loading-state bookkeeping around these two, and the p_mode plumbing is
// worth asserting without a React renderer (this package has no RTL).
//
// The 'transfer' default is deliberately identical to the RPC's own default, so
// every pre-fila call site keeps its exact semantics without being migrated.
export async function addCarsRpc(
  requestId: string, carIds: string[], mode: AssignMode = 'transfer',
): Promise<AssignResult> {
  const { error } = await supabase.rpc('add_cars_to_request', {
    p_request_id: requestId,
    p_car_ids: carIds,
    p_mode: mode,
  })
  if (error) {
    const conflict = parseBusyConflict(error)
    if (conflict) return conflict
    throw new Error(error.message)
  }
  return { status: 'assigned' }
}

export async function addCarRpc(
  requestId: string, carId: string, mode: AssignMode = 'transfer',
): Promise<AssignResult> {
  const { error } = await supabase.rpc('add_car_to_request', {
    p_request_id: requestId,
    p_car_id: carId,
    p_mode: mode,
  })
  if (error) {
    const conflict = parseBusyConflict(error)
    if (conflict) return conflict
    throw new Error(error.message)
  }
  return { status: 'assigned' }
}

export function useAssignCar() {
  const [loading, setLoading] = useState(false)

  // FR1.1/FR1.3 — bulk, atomic (add_cars_to_request, ADR-12).
  const addCars = useCallback(async (
    requestId: string, carIds: string[], mode?: AssignMode,
  ): Promise<AssignResult> => {
    setLoading(true)
    try {
      return await addCarsRpc(requestId, carIds, mode)
    } finally {
      setLoading(false)
    }
  }, [])

  // FR1.4 — single incremental add to an already-multi-car mission.
  const addCar = useCallback(async (
    requestId: string, carId: string, mode?: AssignMode,
  ): Promise<AssignResult> => {
    setLoading(true)
    try {
      return await addCarRpc(requestId, carId, mode)
    } finally {
      setLoading(false)
    }
  }, [])

  // FR2 — explicit confirm-before-transfer (ADR-4). Called only after the
  // operator confirms the AssignmentModal's busy-car warning.
  const confirmTransfer = useCallback(async (requestId: string, carId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('confirm_transfer_car_to_request', {
        p_request_id: requestId,
        p_car_id: carId,
      })
      if (error) throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // FR4 — remove/swap a single car without affecting the mission's other cars.
  const removeCar = useCallback(async (requestId: string, carId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('remove_car_from_request', {
        p_request_id: requestId,
        p_car_id: carId,
      })
      if (error) throw new Error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { addCars, addCar, confirmTransfer, removeCar, loading }
}
