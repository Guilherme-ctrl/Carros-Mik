import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useCars, type Car } from '../cars/useCars'
import { useAssignCar } from '../assignment/useAssignCar'
import { AssignmentModal } from '../assignment/AssignmentModal'
import { CarsPanel } from './CarsPanel'
import { MapPanel } from './MapPanel'
import { RequestDetailSidebar } from './RequestDetailSidebar'
import { RequestsPanel } from './RequestsPanel'
import { useAllRequests, type RequestWithLeader } from './useAllRequests'

interface PendingAssignment {
  car: Car
  isReassignment: boolean
}

type ActiveTab = 'requests' | 'cars' | 'map'

export function DashboardPage() {
  const { cars, setCars, getCars } = useCars()
  const { requests, setRequests, loading: requestsLoading, error: requestsError, getAllRequests } = useAllRequests()
  const { assignCar, reassignCar, loading: assigning } = useAssignCar()

  const [selectedRequest, setSelectedRequest] = useState<RequestWithLeader | null>(null)
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests')

  const openCount = requests.filter((r) => r.status === 'open').length

  // Initial data load
  useEffect(() => {
    getCars()
    getAllRequests()
  }, [getCars, getAllRequests])

  // T07.12 — Realtime on requests
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            getAllRequests()
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RequestWithLeader
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
            )
            setSelectedRequest((prev) =>
              prev?.id === updated.id ? { ...prev, ...updated } : prev
            )
          } else if (payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id))
            setSelectedRequest((prev) =>
              prev?.id === payload.old.id ? null : prev
            )
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [getAllRequests, setRequests])

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

  function handleInitiateAssign(car: Car) {
    if (!selectedRequest) return
    const isReassignment = selectedRequest.status === 'car_assigned'
    setPendingAssignment({ car, isReassignment })
  }

  async function handleConfirmAssignment() {
    if (!selectedRequest || !pendingAssignment) return
    try {
      if (pendingAssignment.isReassignment) {
        await reassignCar(selectedRequest.id, pendingAssignment.car.id)
      } else {
        await assignCar(selectedRequest.id, pendingAssignment.car.id)
      }
      toast.success('Carro atribuído com sucesso')
      setPendingAssignment(null)

      const patch: Partial<RequestWithLeader> = {
        status: 'car_assigned',
        assigned_car_id: pendingAssignment.car.id,
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === selectedRequest.id ? { ...r, ...patch } : r))
      )
      setSelectedRequest((prev) => (prev ? { ...prev, ...patch } : prev))
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
    cars: `Carros (${cars.length})`,
    map: 'Mapa',
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar — visible only on tablet/mobile (< lg) */}
      <div className="flex lg:hidden border-b border-zinc-800 bg-zinc-950 shrink-0">
        {(['requests', 'cars', 'map'] as ActiveTab[]).map((tab) => (
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

      {/* Desktop: 3-column layout */}
      <main className="hidden lg:flex flex-1 overflow-hidden min-h-0">
        <RequestsPanel
          requests={requests}
          loading={requestsLoading}
          error={requestsError}
          selectedId={selectedRequest?.id ?? null}
          onSelectRequest={setSelectedRequest}
        />
        <CarsPanel
          cars={cars}
          loading={requestsLoading}
          selectedRequest={selectedRequest}
          onInitiateAssign={handleInitiateAssign}
        />
        <MapPanel cars={cars} requests={requests} />
      </main>

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
        {activeTab === 'cars' && (
          <CarsPanel
            cars={cars}
            loading={requestsLoading}
            selectedRequest={selectedRequest}
            onInitiateAssign={handleInitiateAssign}
            fullWidth
          />
        )}
        {activeTab === 'map' && <MapPanel cars={cars} requests={requests} />}
      </main>

      <RequestDetailSidebar
        request={selectedRequest}
        cars={cars}
        onClose={() => setSelectedRequest(null)}
        onInitiateAssign={handleInitiateAssign}
      />

      {pendingAssignment && selectedRequest && (
        <AssignmentModal
          request={selectedRequest}
          car={pendingAssignment.car}
          isReassignment={pendingAssignment.isReassignment}
          loading={assigning}
          onConfirm={handleConfirmAssignment}
          onClose={() => setPendingAssignment(null)}
        />
      )}
    </div>
  )
}
