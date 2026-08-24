import { describe, expect, it } from 'vitest'
import { formatRequestForWhatsApp } from '../formatRequestForWhatsApp'
import type { RequestWithLeader } from '../../../features/dashboard/useAllRequests'

function pedido(over: Partial<RequestWithLeader> = {}): RequestWithLeader {
  return {
    id: 'r1', leader_id: 'l1', leader_user_id: 'u1',
    event: 'Prova', stage: '1',
    street: 'Rua Itajaí', street_number: '100', neighborhood: 'Centro',
    city: 'Gaspar', latitude: null, longitude: null,
    objective: 'Obj', maps_link: null, notes: null,
    status: 'car_assigned',
    created_at: '2026-08-24T10:00:00Z', updated_at: '2026-08-24T10:00:00Z',
    leaders: { name: 'Ana', table_name: 'Mesa 3', phone: '4790000001' },
    cars: [],
    ...over,
  }
}

describe('formatRequestForWhatsApp', () => {
  // A cidade faltava na mensagem pelo mesmo motivo que faltava na navegação:
  // ninguém a guardava. "Rua Itajaí, Centro" existe em Gaspar e em Blumenau.
  it('inclui a cidade no endereço', () => {
    expect(formatRequestForWhatsApp(pedido())).toContain('Centro, Gaspar')
  })

  it('monta o link do Maps a partir da coordenada quando não há link colado', () => {
    const texto = formatRequestForWhatsApp(
      pedido({ latitude: -26.9194, longitude: -49.0661 }),
    )
    expect(texto).toContain('https://maps.google.com/?q=-26.9194,-49.0661')
  })

  it('um link colado à mão continua tendo prioridade', () => {
    const texto = formatRequestForWhatsApp(
      pedido({ maps_link: 'https://maps.app.goo.gl/abc', latitude: -26.9, longitude: -49.0 }),
    )
    expect(texto).toContain('https://maps.app.goo.gl/abc')
  })

  it('sem link e sem coordenada, diz que não foi informado', () => {
    expect(formatRequestForWhatsApp(pedido())).toContain('Maps: Não informado')
  })
})
