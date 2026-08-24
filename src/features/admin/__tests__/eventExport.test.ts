import { describe, expect, it, vi } from 'vitest'

// eventExport.ts importa o client do Supabase no topo do módulo; buildSheets
// não o usa, mas o import precisa resolver.
vi.mock('../../../lib/supabase', () => ({ supabase: {} }))

import { buildSheets, exportFileName, type EventSnapshot } from '../eventExport'

// O snapshot mínimo que exercita o que importa em contingência: uma missão
// ativa com dois carros (um reportado, um pendente), uma encerrada, uma fila
// com carro parado, e uma mensagem.
function snapshot(): EventSnapshot {
  const carA = {
    id: 'car-a', number: '01', pilot_name: 'Guilherme', pilot_phone: '47999368732',
    copilot_name: null, copilot_phone: null, operational_status: 'on_mission',
  }
  const carB = {
    id: 'car-b', number: '02', pilot_name: 'Clério', pilot_phone: '47996574766',
    copilot_name: 'Crocodundee', copilot_phone: null, operational_status: 'offline',
  }
  const leader = { name: 'Ana', phone: '4790000001', table_name: 'Mesa 3' }

  return {
    requests: [
      {
        id: 'req-ativa', event: 'Buscar Cachorro', stage: '1',
        street: 'Rua XV', street_number: '100', neighborhood: 'Centro',
        objective: 'Busca cachorro', notes: 'Portão azul',
        status: 'car_assigned', outcome: null,
        created_at: '2026-08-24T13:00:00Z', updated_at: '2026-08-24T13:30:00Z',
        leaders: leader,
        request_cars: [
          { car_id: 'car-a', status: 'on_site', outcome: 'found', is_current: true, removed_at: null, cars: carA },
          { car_id: 'car-b', status: 'on_the_way', outcome: null, is_current: true, removed_at: null, cars: carB },
          // Enfileirada: não é da guarnição e não pode entrar na contagem.
          { car_id: 'car-b', status: 'car_assigned', outcome: null, is_current: false, removed_at: null, cars: carB },
        ],
      },
      {
        id: 'req-fim', event: 'Levar Bandeira', stage: '2',
        street: 'Rua 7', street_number: '9', neighborhood: 'Vorstadt',
        objective: 'Entrega', notes: null,
        status: 'completed', outcome: 'not_found',
        created_at: '2026-08-24T10:00:00Z', updated_at: '2026-08-24T11:00:00Z',
        leaders: leader,
        request_cars: [
          { car_id: 'car-a', status: 'returning', outcome: 'not_found', is_current: true, removed_at: '2026-08-24T11:00:00Z', cars: carA },
        ],
      },
    ],
    cars: [carA, carB],
    leaders: [leader],
    priorities: { 'req-ativa': 'alta' },
    queue: [
      { car_id: 'car-b', queue_count: 1, is_stranded: true, items: [{ request_id: 'req-ativa', priority: 'alta', label: 'Buscar Cachorro' }] },
      { car_id: 'car-a', queue_count: 0, is_stranded: false, items: [] },
    ],
    comments: [
      { request_id: 'req-ativa', author_name: 'Guilherme', content: 'Cheguei no local', created_at: '2026-08-24T13:20:00Z' },
    ],
  }
}

describe('buildSheets', () => {
  it('produz as 6 abas, com as ativas primeiro', () => {
    const names = buildSheets(snapshot()).map((s) => s.name)
    expect(names[0]).toBe('Missões ativas')
    expect(names).toEqual([
      'Missões ativas', 'Fila por carro', 'Carros', 'Líderes', 'Mensagens', 'Encerradas',
    ])
  })

  // Nomes de aba do xlsx têm limite de 31 caracteres e proíbem : \ / ? * [ ].
  // Estourar isso só falharia na hora de gerar o arquivo, em contingência.
  it('usa nomes de aba válidos para xlsx', () => {
    for (const { name } of buildSheets(snapshot())) {
      expect(name.length).toBeLessThanOrEqual(31)
      expect(name).not.toMatch(/[:\\/?*[\]]/)
    }
  })

  it('separa ativas de encerradas', () => {
    const sheets = buildSheets(snapshot())
    const ativas = sheets.find((s) => s.name === 'Missões ativas')!
    const fim = sheets.find((s) => s.name === 'Encerradas')!
    // 1 cabeçalho + 1 linha em cada
    expect(ativas.rows).toHaveLength(2)
    expect(fim.rows).toHaveLength(2)
    expect(ativas.rows[1].map((c) => c.value)).toContain('Buscar Cachorro')
    expect(fim.rows[1].map((c) => c.value)).toContain('Levar Bandeira')
  })

  it('conta só a guarnição atual, ignorando a linha enfileirada do mesmo carro', () => {
    const ativas = buildSheets(snapshot()).find((s) => s.name === 'Missões ativas')!
    const carros = ativas.rows[1].find((_, i) => ativas.rows[0][i].value === 'Carros')!
    expect(carros.value).toBe('01, 02')
  })

  // A informação que decide se a missão pode ser encerrada.
  it('mostra o desfecho POR CARRO, marcando quem falta', () => {
    const ativas = buildSheets(snapshot()).find((s) => s.name === 'Missões ativas')!
    const idx = ativas.rows[0].findIndex((c) => c.value === 'Desfecho por carro')
    expect(ativas.rows[1][idx].value).toBe('01: Achei · 02: pendente')
  })

  it('leva telefone de piloto e de líder para a aba de missões', () => {
    const ativas = buildSheets(snapshot()).find((s) => s.name === 'Missões ativas')!
    const values = ativas.rows[1].map((c) => String(c.value))
    expect(values).toContain('4790000001')
    expect(values.some((v) => v.includes('47999368732'))).toBe(true)
  })

  // A fila só existe no banco: nenhuma tela imprime e o motorista vê só "+N".
  it('exporta a fila com posição e marca o carro parado', () => {
    const fila = buildSheets(snapshot()).find((s) => s.name === 'Fila por carro')!
    expect(fila.rows).toHaveLength(2)
    const row = fila.rows[1].map((c) => c.value)
    expect(row).toContain('02')
    expect(row).toContain(1)
    expect(row).toContain('SIM')
  })

  it('não deixa a aba de fila vazia sem explicação', () => {
    const snap = snapshot()
    snap.queue = [{ car_id: 'car-a', queue_count: 0, is_stranded: false, items: [] }]
    const fila = buildSheets(snap).find((s) => s.name === 'Fila por carro')!
    expect(fila.rows[1][0].value).toBe('Nenhuma missão enfileirada')
  })

  it('aponta a missão atual de cada carro na aba Carros', () => {
    const carros = buildSheets(snapshot()).find((s) => s.name === 'Carros')!
    const idx = carros.rows[0].findIndex((c) => c.value === 'Missão atual')
    expect(carros.rows[1][idx].value).toBe('Buscar Cachorro · Etapa 1')
  })

  // Nenhuma célula pode ser null/undefined: write-excel-file aceita apenas
  // String/Number/Date/Boolean, e um null derruba o arquivo inteiro.
  it('nunca emite célula nula', () => {
    for (const { rows } of buildSheets(snapshot())) {
      for (const row of rows) {
        for (const cell of row) {
          expect(cell.value).not.toBeNull()
          expect(cell.value).not.toBeUndefined()
        }
      }
    }
  })
})

describe('exportFileName', () => {
  it('data e hora em horário de Brasília, sem caracteres proibidos', () => {
    const name = exportFileName(new Date('2026-08-24T23:05:00Z'))
    // 23:05 UTC = 20:05 em São Paulo
    expect(name).toBe('carros-mik-dundee-2026-08-24-20-05.xlsx')
    expect(name).not.toMatch(/[:\s]/)
  })
})
