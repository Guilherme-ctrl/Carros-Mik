import { supabase } from '../../lib/supabase'

// Pacote de contingência do evento.
//
// A pergunta que este arquivo responde é: "o sistema caiu no meio da gincana —
// o que eu preciso ter na mão para continuar operando no papel?" Não é um dump
// do banco (isso são os JSON/SQL de restauração); é o que uma pessoa lê e usa.
//
// Três coisas guiaram o recorte:
//  - TELEFONE EM TUDO. Sem sistema, a operação vira rádio e ligação. Piloto,
//    copiloto e líder aparecem com número em toda aba onde fazem sentido.
//  - A FILA PRECISA SAIR. Ela só existe no banco: nenhuma tela imprime, e o
//    motorista só vê "+N". Se o sistema cai e a fila não foi exportada, a
//    ordem das próximas missões some junto.
//  - ATIVAS PRIMEIRO. A primeira aba é o que está aberto agora; o histórico
//    vem depois, porque em contingência ninguém abre uma planilha para ler o
//    que já acabou.

const ACTIVE_STATUSES = ['open', 'under_review', 'car_assigned']

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta',
  under_review: 'Em análise',
  car_assigned: 'Designada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

const CAR_STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  on_mission: 'Em missão',
  offline: 'Offline',
  unavailable: 'Indisponível',
}

const OUTCOME_LABEL: Record<string, string> = {
  found: 'Achei',
  not_found: 'Não achei',
}

function brt(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso)).replace(', ', ' ')
}

interface RawCar {
  id: string
  number: string
  pilot_name: string
  pilot_phone: string | null
  copilot_name: string | null
  copilot_phone: string | null
  operational_status: string
}

interface RawRequestCar {
  car_id: string
  status: string
  outcome: string | null
  is_current: boolean
  removed_at: string | null
  cars: RawCar | null
}

interface RawRequest {
  id: string
  event: string
  stage: string
  street: string
  street_number: string
  neighborhood: string
  objective: string
  notes: string | null
  status: string
  outcome: string | null
  created_at: string
  updated_at: string
  leaders: { name: string; phone: string | null; table_name: string | null } | null
  request_cars: RawRequestCar[]
}

export interface EventSnapshot {
  requests: RawRequest[]
  cars: RawCar[]
  leaders: Array<{ name: string; phone: string | null; table_name: string | null }>
  priorities: Record<string, string>
  queue: Array<{ car_id: string; queue_count: number; is_stranded: boolean; items: Array<{ request_id: string; priority: string; label: string }> }>
  comments: Array<{ request_id: string; author_name: string; content: string; created_at: string }>
}

// Busca tudo de uma vez. Em paralelo de propósito: em contingência quem clica
// já está com pressa, e são consultas independentes.
export async function fetchEventSnapshot(): Promise<EventSnapshot> {
  const [requests, cars, leaders, priorities, queue, comments] = await Promise.all([
    supabase
      .from('requests')
      .select(`id, event, stage, street, street_number, neighborhood, objective, notes,
               status, outcome, created_at, updated_at,
               leaders(name, phone, table_name),
               request_cars(car_id, status, outcome, is_current, removed_at,
                            cars(id, number, pilot_name, pilot_phone, copilot_name, copilot_phone, operational_status))`)
      .order('created_at', { ascending: true }),
    supabase.from('cars').select('id, number, pilot_name, pilot_phone, copilot_name, copilot_phone, operational_status').order('number'),
    supabase.from('leaders').select('name, phone, table_name').order('name'),
    // request_priorities é central-only por RLS (FILA-ADR-2). Um Líder que
    // chegasse aqui receberia lista vazia, não erro — mas o botão já é
    // central-only, então isto é só o cinto do suspensório.
    supabase.from('request_priorities').select('request_id, priority'),
    supabase.rpc('get_fleet_queue_overview'),
    supabase.from('request_comments')
      .select('request_id, author_name, content, created_at')
      .order('created_at', { ascending: true }),
  ])

  const priorityByRequest: Record<string, string> = {}
  for (const row of (priorities.data ?? []) as Array<{ request_id: string; priority: string }>) {
    priorityByRequest[row.request_id] = row.priority
  }

  return {
    requests: (requests.data ?? []) as unknown as RawRequest[],
    cars: (cars.data ?? []) as RawCar[],
    leaders: (leaders.data ?? []) as EventSnapshot['leaders'],
    priorities: priorityByRequest,
    queue: (queue.data ?? []) as EventSnapshot['queue'],
    comments: (comments.data ?? []) as EventSnapshot['comments'],
  }
}

// ─── montagem das abas ───────────────────────────────────────────────────────

// Sem `null`: write-excel-file aceita apenas String/Number/Date/Boolean ou
// ausência de valor. Toda célula abaixo já resolve o nulo com `?? ''`, então o
// tipo aqui é o que de fato é produzido — e o compilador passa a cobrar isso.
type Row = Array<{ value: string | number; fontWeight?: 'bold' }>

function header(labels: string[]): Row {
  return labels.map((value) => ({ value, fontWeight: 'bold' as const }))
}

function activeCars(r: RawRequest): RawRequestCar[] {
  return r.request_cars.filter((rc) => rc.removed_at === null && rc.is_current && rc.cars !== null)
}

function missionRows(snap: EventSnapshot, requests: RawRequest[]): Row[] {
  const rows: Row[] = [header([
    'Status', 'Prioridade', 'Evento', 'Etapa', 'Objetivo',
    'Endereço', 'Bairro', 'Líder', 'Mesa', 'Tel. Líder',
    'Carros', 'Pilotos', 'Tel. Pilotos', 'Desfecho por carro',
    'Desfecho final', 'Aberta em', 'Atualizada em', 'Observações',
  ])]

  for (const r of requests) {
    const cs = activeCars(r)
    rows.push([
      { value: STATUS_LABEL[r.status] ?? r.status },
      { value: snap.priorities[r.id] ?? 'normal' },
      { value: r.event },
      { value: r.stage },
      { value: r.objective },
      { value: `${r.street}, ${r.street_number}` },
      { value: r.neighborhood },
      { value: r.leaders?.name ?? '' },
      { value: r.leaders?.table_name ?? '' },
      { value: r.leaders?.phone ?? '' },
      { value: cs.map((c) => c.cars!.number).join(', ') },
      { value: cs.map((c) => c.cars!.pilot_name).join(', ') },
      { value: cs.map((c) => c.cars!.pilot_phone ?? '—').join(', ') },
      // Por carro, e não só o agregado: em contingência importa saber QUEM já
      // reportou, porque é isso que decide se a missão pode ser encerrada.
      { value: cs.map((c) => `${c.cars!.number}: ${c.outcome ? OUTCOME_LABEL[c.outcome] : 'pendente'}`).join(' · ') },
      { value: r.outcome ? (OUTCOME_LABEL[r.outcome] ?? r.outcome) : '' },
      { value: brt(r.created_at) },
      { value: brt(r.updated_at) },
      { value: r.notes ?? '' },
    ])
  }
  return rows
}

export function buildSheets(snap: EventSnapshot) {
  const active = snap.requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const closed = snap.requests.filter((r) => !ACTIVE_STATUSES.includes(r.status))

  const carsById = new Map(snap.cars.map((c) => [c.id, c]))

  const queueRows: Row[] = [header(['Carro', 'Piloto', 'Tel. Piloto', 'Posição', 'Missão na fila', 'Prioridade', 'Carro parado?'])]
  for (const q of snap.queue) {
    const car = carsById.get(q.car_id)
    if (!car || q.queue_count === 0) continue
    q.items.forEach((item, idx) => {
      queueRows.push([
        { value: car.number },
        { value: car.pilot_name },
        { value: car.pilot_phone ?? '' },
        { value: idx + 1 },
        { value: item.label },
        { value: item.priority },
        // FR9: carro offline/indisponível com missão comprometida. Sem sistema,
        // é o primeiro problema que alguém precisa resolver na mão.
        { value: q.is_stranded ? 'SIM' : '' },
      ])
    })
  }
  if (queueRows.length === 1) queueRows.push([{ value: 'Nenhuma missão enfileirada' }])

  const carRows: Row[] = [header(['Carro', 'Piloto', 'Tel. Piloto', 'Copiloto', 'Tel. Copiloto', 'Status', 'Missão atual'])]
  for (const c of snap.cars) {
    const current = snap.requests.find((r) =>
      activeCars(r).some((rc) => rc.car_id === c.id))
    carRows.push([
      { value: c.number },
      { value: c.pilot_name },
      { value: c.pilot_phone ?? '' },
      { value: c.copilot_name ?? '' },
      { value: c.copilot_phone ?? '' },
      { value: CAR_STATUS_LABEL[c.operational_status] ?? c.operational_status },
      { value: current ? `${current.event} · Etapa ${current.stage}` : '' },
    ])
  }

  const leaderRows: Row[] = [header(['Líder', 'Mesa', 'Telefone'])]
  for (const l of snap.leaders) {
    leaderRows.push([{ value: l.name }, { value: l.table_name ?? '' }, { value: l.phone ?? '' }])
  }

  const eventByRequest = new Map(snap.requests.map((r) => [r.id, r.event]))
  const msgRows: Row[] = [header(['Quando', 'Missão', 'Autor', 'Mensagem'])]
  for (const m of snap.comments) {
    msgRows.push([
      { value: brt(m.created_at) },
      { value: eventByRequest.get(m.request_id) ?? '' },
      { value: m.author_name },
      { value: m.content },
    ])
  }

  return [
    { name: 'Missões ativas', rows: missionRows(snap, active) },
    { name: 'Fila por carro',  rows: queueRows },
    { name: 'Carros',          rows: carRows },
    { name: 'Líderes',         rows: leaderRows },
    { name: 'Mensagens',       rows: msgRows },
    { name: 'Encerradas',      rows: missionRows(snap, closed) },
  ]
}

export function exportFileName(now = new Date()): string {
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(now).replace(/[: ]/g, '-')
  return `carros-mik-dundee-${stamp}.xlsx`
}
