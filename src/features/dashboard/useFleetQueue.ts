import { create } from 'zustand'
import { supabase } from '../../lib/supabase'

// FILA-ADR-2 — the three priority levels that order every car's queue. A
// request with no row in request_priorities is implicitly 'normal'; the RPC
// already resolves that COALESCE server-side, so the client never sees a null.
export type RequestPriority = 'baixa' | 'normal' | 'alta'

// Raw row exactly as PostgREST returns get_fleet_queue_overview() — snake_case,
// one row per car (EVERY car, including the ones with an empty queue).
export interface RawFleetQueueRow {
  car_id: string
  queue_count: number
  is_stranded: boolean
  items: Array<{ request_id: string; priority: RequestPriority; label: string }> | null
}

// The camelCase shape the components consume. No snake_case ever reaches a
// component prop.
export interface FleetQueueEntry {
  carId: string
  queueCount: number
  isStranded: boolean
  // The ORDER is the contract (FILA-ADR-1 / BR5): priority DESC, then
  // requests.created_at ASC, decided server-side inside jsonb_agg so it matches
  // the promotion order exactly. Never re-sorted client-side.
  items: Array<{ requestId: string; priority: RequestPriority; label: string }>
}

// Exported for unit testing — same precedent as parseBusyConflict
// (useAssignCar.ts) and toAssignedCars (useAllRequests.ts): the mapping is the
// one piece worth covering in isolation, without a live Supabase client.
export function toQueueByCarId(rows: RawFleetQueueRow[]): Record<string, FleetQueueEntry> {
  return Object.fromEntries(
    rows.map((row) => [
      row.car_id,
      {
        carId: row.car_id,
        queueCount: row.queue_count ?? 0,
        isStranded: row.is_stranded ?? false,
        items: (row.items ?? []).map((item) => ({
          requestId: item.request_id,
          priority: item.priority,
          label: item.label,
        })),
      },
    ]),
  )
}

interface FleetQueueStore {
  // Indexed by car id — get_fleet_queue_overview returns an ARRAY, and every
  // consumer looks a single car up, so the hook owns that transformation.
  queueByCarId: Record<string, FleetQueueEntry>
  loading: boolean
  error: string | null
  getOverview: () => Promise<void>
  setPriority: (requestId: string, priority: RequestPriority) => Promise<void>
}

// US7/US8/FR9 — Mesa Central's fleet-wide queue picture (FILA-ADR-9: is_stranded
// is derived by the RPC, never a stored column).
//
// A SHARED store (zustand, the same pattern already used by useAuth) rather than
// a per-component useState hook, because two design decisions only line up if
// every consumer reads one state:
//   - frontend-components.md: CarsStatusDropdown consumes this hook INTERNALLY,
//     deliberately not via props;
//   - nfr-design Q1=B: DashboardPage drives the reactive refetch from the
//     Realtime channel it already owns.
// With a per-instance hook, DashboardPage's refetch would update a state that
// nothing renders. Sharing it also keeps the up-to-3 mounted CarsStatusDropdowns
// (desktop grid, mobile map tab, MapWindowPage) consistent with each other.
export const useFleetQueue = create<FleetQueueStore>((set, get) => ({
  queueByCarId: {},
  loading: false,
  error: null,

  async getOverview() {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_fleet_queue_overview')
      if (error) throw new Error(error.message)
      set({ queueByCarId: toQueueByCarId((data ?? []) as RawFleetQueueRow[]) })
    } catch (err) {
      // Recorded rather than thrown: this also runs from a debounced Realtime
      // timer (DashboardPage), where a rejection would have no caller and would
      // surface as an unhandled promise rejection. Same shape as useCars /
      // useAllRequests. Never swallowed — CarsStatusDropdown renders it.
      set({ error: err instanceof Error ? err.message : 'Erro ao buscar filas da frota' })
    } finally {
      set({ loading: false })
    }
  },

  // FR2.3 / FILA-ADR-12 — Mesa Central reorders a queue by changing a mission's
  // priority. Reordering never promotes anything (BR6): the car finishes what it
  // is driving first. Setting the value it already has is a backend no-op (BR8),
  // which needs no special handling here.
  async setPriority(requestId, priority) {
    set({ loading: true })
    try {
      const { error } = await supabase.rpc('set_request_priority', {
        p_request_id: requestId,
        p_priority: priority,
      })
      if (error) throw new Error(error.message)

      // PESSIMISTIC (nfr-design Q2=A) — no optimistic patch. The UI only moves
      // once the write has committed AND the re-read confirms the new order.
      // Sequential, never parallel: a refetch racing the write could read the
      // pre-write row. request_priorities is in no Realtime publication, so this
      // explicit refetch is what updates the editor's own session.
      await get().getOverview()

      // getOverview records its failure in `error` instead of throwing (see
      // above). Here there IS a caller to catch it, so re-raise: reporting
      // success while the list still shows the old order would be a lie.
      const refetchError = get().error
      if (refetchError) throw new Error(refetchError)
    } finally {
      set({ loading: false })
    }
  },
}))
