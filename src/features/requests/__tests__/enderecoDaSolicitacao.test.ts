import { describe, expect, it } from 'vitest'
import {
  lerEnderecoColado,
  lerLinkMaps,
  pareceLink,
  resolverEndereco,
  validarEndereco,
  SEM_NUMERO,
  type EntradaEndereco,
} from '../enderecoDaSolicitacao'

const base: EntradaEndereco = {
  modo: 'endereco',
  street: 'Rua XV de Novembro',
  streetNumber: '1400',
  neighborhood: 'Centro',
  city: 'Blumenau',
  mapsLink: '',
  coords: null,
}

const porLink: EntradaEndereco = {
  ...base,
  modo: 'link',
  street: 'Posto Ipiranga da Rua XV',
  streetNumber: '',
  mapsLink: 'https://maps.app.goo.gl/abc123',
}

describe('resolverEndereco — modo endereço', () => {
  it('passa os campos adiante, aparados', () => {
    const r = resolverEndereco({ ...base, street: '  Rua XV  ', streetNumber: ' 1400 ' })
    expect(r.street).toBe('Rua XV')
    expect(r.street_number).toBe('1400')
    expect(r.maps_link).toBeNull()
  })

  it('leva a coordenada da busca quando existe', () => {
    const r = resolverEndereco({ ...base, coords: { lat: -26.91, lng: -49.06 } })
    expect(r.latitude).toBe(-26.91)
    expect(r.longitude).toBe(-49.06)
  })
})

describe('resolverEndereco — modo link', () => {
  it('grava s/n no número para a linha do app ficar legível', () => {
    const r = resolverEndereco(porLink)
    expect(r.street_number).toBe(SEM_NUMERO)
    // É esta a linha que o motorista lê: `street, street_number — neighborhood`
    expect(`${r.street}, ${r.street_number} — ${r.neighborhood}`)
      .toBe('Posto Ipiranga da Rua XV, s/n — Centro')
  })

  it('sem bairro cai na cidade — o link do Maps não carrega bairro', () => {
    const r = resolverEndereco({ ...porLink, neighborhood: '' })
    expect(r.neighborhood).toBe('Blumenau')
    expect(`${r.street}, ${r.street_number} — ${r.neighborhood}`)
      .toBe('Posto Ipiranga da Rua XV, s/n — Blumenau')
  })

  it('nunca deixa campo vazio — o app quebraria ao carregar a missão', () => {
    const r = resolverEndereco(porLink)
    for (const v of [r.street, r.street_number, r.neighborhood, r.city]) {
      expect(v.length).toBeGreaterThan(0)
    }
  })

  it('guarda o link e a coordenada lida dele', () => {
    const r = resolverEndereco({ ...porLink, coords: { lat: -26.9, lng: -49.0 } })
    expect(r.maps_link).toBe('https://maps.app.goo.gl/abc123')
    expect(r.latitude).toBe(-26.9)
  })

  it('sem coordenada a missão ainda é válida — o app abre o link', () => {
    const r = resolverEndereco({ ...porLink, coords: null })
    expect(r.latitude).toBeNull()
    expect(r.maps_link).toBe('https://maps.app.goo.gl/abc123')
  })
})

describe('validarEndereco', () => {
  it('modo endereço exige rua e número', () => {
    const e = validarEndereco({ ...base, street: '', streetNumber: '' })
    expect(e.street).toBeDefined()
    expect(e.streetNumber).toBeDefined()
  })

  it('modo link NÃO exige número', () => {
    expect(validarEndereco(porLink)).toEqual({})
  })

  it('modo link exige referência e link', () => {
    const e = validarEndereco({ ...porLink, street: '', mapsLink: '' })
    expect(e.street).toBe('Diga um ponto de referência')
    expect(e.mapsLink).toBe('Cole o link do Maps')
  })

  it('recusa link que não é link', () => {
    expect(validarEndereco({ ...porLink, mapsLink: 'perto do posto' }).mapsLink)
      .toBe('Isso não parece um link')
  })

  it('modo link NÃO exige bairro — o campo nem existe na tela', () => {
    expect(validarEndereco({ ...porLink, neighborhood: '' })).toEqual({})
  })

  it('modo endereço segue exigindo bairro', () => {
    expect(validarEndereco({ ...base, neighborhood: '' }).neighborhood).toBeDefined()
  })

  it('cidade é obrigatória nos dois modos', () => {
    for (const modo of ['endereco', 'link'] as const) {
      expect(validarEndereco({ ...porLink, modo, city: '' }).city).toBeDefined()
    }
  })
})

describe('pareceLink', () => {
  it('aceita o que os apps de mapa compartilham', () => {
    for (const l of [
      'https://maps.app.goo.gl/abc',
      'https://www.google.com/maps/place/Blumenau',
      'http://maps.google.com/?q=-26.9,-49.0',
      'https://waze.com/ul?ll=-26.9,-49.0',
    ]) expect(pareceLink(l)).toBe(true)
  })

  it('recusa texto solto', () => {
    for (const l of ['', '   ', 'posto ipiranga', 'google.com']) {
      expect(pareceLink(l)).toBe(false)
    }
  })
})

// O link exatamente como o Maps do desktop produz — copiado da barra de
// endereços em 29/08, sem editar nada.
const LINK_REAL =
  'https://www.google.com/maps/place/Casa+Feijuca+Restaurante+e+Pizzaria/' +
  '@-26.9073362,-49.079541,17z/data=!3m1!4b1!4m6!3m5!' +
  '1s0x94df19828fdde70d:0x8b137f7454d3b4ce!8m2!3d-26.9073362!4d-49.079541' +
  '!16s%2Fg%2F11hcj3fnnx?entry=ttu'

describe('lerLinkMaps', () => {
  it('lê coordenada e nome do link real do Maps', () => {
    const r = lerLinkMaps(LINK_REAL)
    expect(r.coords).toEqual({ lat: -26.9073362, lng: -49.079541 })
    expect(r.nome).toBe('Casa Feijuca Restaurante e Pizzaria')
  })

  it('prefere o ponto do lugar (!3d!4d) ao centro do mapa (@)', () => {
    // Mapa arrastado antes de copiar: o @ desvia, o !3d!4d continua no lugar.
    const arrastado =
      'https://www.google.com/maps/place/X/@-26.8000000,-49.0000000,17z/data=!8m2!3d-26.9073362!4d-49.079541'
    expect(lerLinkMaps(arrastado).coords).toEqual({ lat: -26.9073362, lng: -49.079541 })
  })

  it('link curto não entrega nada, e isso não é erro', () => {
    const r = lerLinkMaps('https://maps.app.goo.gl/aBcD1234')
    expect(r.coords).toBeNull()
    expect(r.nome).toBeNull()
  })

  it('lê os outros formatos', () => {
    expect(lerLinkMaps('https://maps.google.com/?q=-26.91,-49.06').coords).toEqual({ lat: -26.91, lng: -49.06 })
    expect(lerLinkMaps('https://waze.com/ul?ll=-26.91,-49.06').coords).toEqual({ lat: -26.91, lng: -49.06 })
    expect(lerLinkMaps('https://www.google.com/maps/search/?api=1&query=-26.91,-49.06').coords)
      .toEqual({ lat: -26.91, lng: -49.06 })
  })

  it('nunca estoura, seja qual for a entrada', () => {
    for (const v of ['', '   ', 'nem é link', 'https://%%%', 'https://google.com/maps/place/%E0%A4%A']) {
      expect(() => lerLinkMaps(v)).not.toThrow()
    }
  })

  it('recusa coordenada implausível', () => {
    expect(lerLinkMaps('https://x.com/?q=999.0,-49.0').coords).toBeNull()
    expect(lerLinkMaps('https://x.com/?q=0.0,0.0').coords).toBeNull()
  })

  it('não usa coordenada crua como nome do lugar', () => {
    expect(lerLinkMaps('https://www.google.com/maps/place/-26.9073362,-49.079541/@-26.9,-49.0,17z').nome)
      .toBeNull()
  })
})

describe('lerEnderecoColado', () => {
  it('lê o endereço que o Maps copia', () => {
    // Colado por um líder em 29/08, exatamente como saiu do Maps.
    expect(lerEnderecoColado('R. Antônio da Veiga, 390 - Victor Konder, Blumenau - SC, 89030-103'))
      .toEqual({
        street: 'R. Antônio da Veiga',
        streetNumber: '390',
        neighborhood: 'Victor Konder',
        city: 'Blumenau',
      })
  })

  it('funciona sem CEP', () => {
    expect(lerEnderecoColado('Av. Brasil, 100 - Ponta Aguda, Blumenau - SC')?.neighborhood)
      .toBe('Ponta Aguda')
  })

  it('lê cidade vizinha, não só Blumenau', () => {
    expect(lerEnderecoColado('Rua Itajaí, 55 - Centro, Gaspar - SC, 89110-000')?.city)
      .toBe('Gaspar')
  })

  it('aceita s/n no número', () => {
    expect(lerEnderecoColado('Rua da Praia, s/n - Centro, Timbó - SC')?.streetNumber).toBe('s/n')
  })

  it('não confunde link com endereço', () => {
    expect(lerEnderecoColado('https://maps.app.goo.gl/abc')).toBeNull()
    expect(lerEnderecoColado('https://www.google.com/maps/place/X/@-26.9,-49.0,17z')).toBeNull()
  })

  it('devolve null para texto solto, sem estourar', () => {
    for (const v of ['', '   ', 'perto do posto', 'Rua sem número nem bairro']) {
      expect(lerEnderecoColado(v)).toBeNull()
    }
  })
})
