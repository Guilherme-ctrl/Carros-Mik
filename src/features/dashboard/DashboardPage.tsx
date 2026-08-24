import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useCars, type Car } from '../cars/useCars'
import { useAssignCar, type AssignMode } from '../assignment/useAssignCar'
import { AssignmentModal } from '../assignment/AssignmentModal'
import { CarsStatusDropdown } from './CarsStatusDropdown'
import { MapPanel } from './MapPanel'
import { DashboardRequestSidebar } from './DashboardRequestSidebar'
import { RequestsPanel } from './RequestsPanel'
import { useAllRequests, type RequestWithLeader } from './useAllRequests'
import { useFleetQueue } from './useFleetQueue'

// FR1.3 — a pending bulk assignment, plus the busy-car conflict (if any) the
// RPC reported for one of the selected cars. `carIds` is the full original
// selection, so a confirmed transfer can re-submit the whole batch (ADR-12 —
// the batch RPC is all-or-nothing, so a partial retry isn't a thing).
interface PendingAssignment {
  carIds: string[]
  conflict: { car: Car; conflictingRequestId: string } | null
}

type ActiveTab = 'requests' | 'map'

export function DashboardPage() {
  const { cars, setCars, getCars } = useCars()
  const { requests, loading: requestsLoading, error: requestsError, getAllRequests } = useAllRequests()
  const { addCars, addCar, confirmTransfer, removeCar, loading: assigning } = useAssignCar()
  // Selector form on purpose: this page only needs to TRIGGER the fleet-queue
  // refetch (the queue UI itself lives in CarsStatusDropdown, which reads the
  // same shared store), so it must not re-render on every queue state change.
  const getFleetQueueOverview = useFleetQueue((s) => s.getOverview)

  const [selectedRequest, setSelectedRequest] = useState<RequestWithLeader | null>(null)
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests')
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(true)

  const openCount = requests.filter((r) => r.status === 'open').length

  // Keep selectedRequest pointing at the freshest row after any refetch.
  const selectedIdRef = useRef<string | null>(null)
  useEffect(() => { selectedIdRef.current = selectedRequest?.id ?? null }, [selectedRequest])
  useEffect(() => {
    if (!selectedIdRef.current) return
    const fresh = requests.find((r) => r.id === selectedIdRef.current)
    if (fresh) setSelectedRequest(fresh)
  }, [requests])

  // Initial data load
  useEffect(() => {
    getCars()
    getAllRequests()
  }, [getCars, getAllRequests])

  // U1 (ADR-1): the car roster now lives in request_cars, a separate table
  // from requests — a full refetch on any change to either is simpler and
  // more correct than trying to patch a joined multi-row relation
  // client-side (the old single-car incremental-patch approach doesn't
  // generalize to N cars). Debounced so a burst of changes (e.g. a bulk
  // assign inserting several request_cars rows at once) triggers one
  // refetch, not N.
  //
  // nfr-design Q1=B — the fleet-queue overview rides THIS callback instead of
  // opening a second channel on the same tables: one 150ms debounce window then
  // covers a burst (e.g. a bulk assign inserting several request_cars rows) for
  // both reads, one refetch each instead of N.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        getAllRequests()
        getFleetQueueOverview()
      }, 150)
    }

    const requestsChannel = supabase
      .channel('dashboard-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, scheduleRefetch)
      .subscribe()

    const requestCarsChannel = supabase
      .channel('dashboard-request-cars')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_cars' }, scheduleRefetch)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(requestCarsChannel)
    }
  }, [getAllRequests, getFleetQueueOverview])

  // T07.13 — Realtime on cars
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-cars')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCars((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Car) : c))
            )
          } else if (payload.eventType === 'INSERT') {
            setCars((prev) => [...prev, payload.new as Car])
          } else if (payload.eventType === 'DELETE') {
            setCars((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [setCars])

  function handleInitiateAssign(carIds: string[]) {
    setPendingAssignment({ carIds, conflict: null })
  }

  function handleRemoveCar(carId: string) {
    if (!selectedRequest) return
    removeCar(selectedRequest.id, carId)
      .then(() => toast.success('Carro removido da missão'))
      .catch(() => toast.error('Erro ao remover carro'))
  }

  // `mode` is what the operator picked in AssignmentModal's EnqueueOrTransferMenu
  // (FILA-ADR-4). It only carries a real choice when there IS a conflict; on the
  // free-car path the modal passes 'transfer' by convention and the RPC ignores
  // it (a free car is assigned outright under either mode).
  async function handleConfirmAssignment(mode: AssignMode) {
    if (!selectedRequest || !pendingAssignment) return
    try {
      // STEP (a), transfer only — free the busy car from its current mission.
      // 'enqueue' deliberately skips this: the car never leaves its origin, the
      // new mission just goes into its queue behind the current one (BR2).
      if (pendingAssignment.conflict && mode === 'transfer') {
        await confirmTransfer(selectedRequest.id, pendingAssignment.conflict.car.id)
      }

      // STEP (b) — re-submit the ORIGINAL full selection (FR1.3: all-or-nothing,
      // no partial-batch special case per ADR-12). This runs on every path: the
      // free-car first submission, the post-confirmTransfer re-submission, and
      // the single-step enqueue. Skipping it after (a) would leave the car freed
      // from its origin but never added to the destination.
      const result = await (pendingAssignment.carIds.length > 1
        ? addCars(selectedRequest.id, pendingAssignment.carIds, mode)
        : addCar(selectedRequest.id, pendingAssignment.carIds[0], mode))
      if (result.status === 'needs_confirmation') {
        // Rare double-busy race — surface it again rather than looping silently.
        // Unreachable under 'enqueue' (BR2: that mode never raises), kept as one
        // shared branch rather than duplicated per mode.
        const conflictingCar = cars.find((c) => c.id === result.conflictingCarId)
        if (conflictingCar) {
          setPendingAssignment({
            carIds: pendingAssignment.carIds,
            conflict: { car: conflictingCar, conflictingRequestId: result.conflictingRequestId },
          })
          return
        }
      }
      toast.success(
        mode === 'enqueue' ? 'Carro(s) enfileirado(s) com sucesso' : 'Carro(s) atribuído(s) com sucesso',
      )
      setPendingAssignment(null)
      // Realtime (request_cars insert) will bring the authoritative roster;
      // no optimistic patch needed now that it's a join, not a column.
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('not available')) {
        toast.error('Carro indisponível — escolha outro')
      } else {
        toast.error('Erro ao atribuir carro')
      }
      setPendingAssignment(null)
    }
  }

  const TAB_LABELS: Record<ActiveTab, string> = {
    requests: `Solicitações${openCount > 0 ? ` (${openCount})` : ''}`,
    map: 'Mapa',
  }

  function handleOpenMapWindow() {
    window.open(
      '/dashboard/map-window',
      'mik-dundee-mapa',
      'width=1000,height=800,noopener,noreferrer'
    )
  }

  const pendingCars = pendingAssignment
    ? pendingAssignment.carIds
        .map((id) => cars.find((c) => c.id === id))
        .filter((c): c is Car => !!c)
    : []

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      {/* Tab bar — visible only on tablet/mobile (< lg) */}
      <div className="flex lg:hidden border-b border-zinc-800 bg-zinc-950 shrink-0">
        {(['requests', 'map'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'text-zinc-100 border-[#E91E8C]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Desktop: 2-column grid layout */}
      <main
        className="hidden lg:grid flex-1 overflow-hidden min-h-0"
        style={{
          gridTemplateColumns: requestsPanelOpen
            ? '[requests] 24rem [map] 1fr'
            : '[requests] 0px [map] 1fr',
          transition: 'grid-template-columns 250ms ease-in-out',
        }}
      >
        <RequestsPanel
          requests={requests}
          loading={requestsLoading}
          error={requestsError}
          selectedId={selectedRequest?.id ?? null}
          onSelectRequest={setSelectedRequest}
          isOpen={requestsPanelOpen}
          onToggle={() => setRequestsPanelOpen((p) => !p)}
        />
        <div className="relative flex-1 min-w-0 flex">
          <MapPanel cars={cars} requests={requests} />
          <button
            onClick={handleOpenMapWindow}
            title="Abrir mapa em outra tela"
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 2H2v12h12v-4M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Abrir em outra tela
          </button>
          <CarsStatusDropdown cars={cars} />
        </div>
      </main>

      {/* Floating restore button — desktop only, shown when panel is minimised */}
      {!requestsPanelOpen && (
        <button
          onClick={() => setRequestsPanelOpen(true)}
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-1.5 bg-zinc-900 border border-zinc-700 border-l-0 rounded-r-lg px-1.5 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {openCount > 0 && (
            <span className="text-xs font-bold text-blue-400 leading-none">{openCount}</span>
          )}
        </button>
      )}

      {/* Mobile/tablet: single active panel */}
      <main className="flex lg:hidden flex-1 overflow-hidden min-h-0">
        {activeTab === 'requests' && (
          <RequestsPanel
            requests={requests}
            loading={requestsLoading}
            error={requestsError}
            selectedId={selectedRequest?.id ?? null}
            onSelectRequest={setSelectedRequest}
            fullWidth
          />
        )}
        {activeTab === 'map' && (
          <div className="relative flex-1 min-w-0 flex">
            <MapPanel cars={cars} requests={requests} />
            <button
              onClick={handleOpenMapWindow}
              title="Abrir mapa em outra tela"
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shadow-lg"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 2H2v12h12v-4M9 2h5v5M14 2L7 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Abrir em outra tela
            </button>
            <CarsStatusDropdown cars={cars} />
          </div>
        )}
      </main>

      <DashboardRequestSidebar
        request={selectedRequest}
        cars={cars}
        onClose={() => setSelectedRequest(null)}
        onInitiateAssign={handleInitiateAssign}
        onRemoveCar={handleRemoveCar}
      />

      {pendingAssignment && selectedRequest && pendingCars.length > 0 && (
        <AssignmentModal
          request={selectedRequest}
          selectedCars={pendingCars}
          conflict={pendingAssignment.conflict}
          loading={assigning}
          onConfirm={handleConfirmAssignment}
          onClose={() => setPendingAssignment(null)}
        />
      )}
    </div>
  )
}
