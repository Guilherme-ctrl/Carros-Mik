// Como o líder informou o destino. Dois caminhos que produzem a MESMA forma no
// banco — as colunas street/street_number/neighborhood são NOT NULL e o app do
// motorista lê as três como String não-anulável (`request['street'] as String`),
// então deixá-las vazias faria a missão inteira falhar ao carregar no celular,
// não só mostrar um campo em branco.
//
// Por isso o modo "link" ainda pede a referência, e cai na cidade no lugar do
// bairro. O link do Maps não carrega bairro — só coordenada e nome do lugar —
// e pedir um campo a mais só para satisfazer o NOT NULL seria cobrar da pessoa
// o preço de uma restrição técnica. Com a cidade, a linha do app fecha
// natural: "Casa Feijuca Restaurante e Pizzaria, s/n — Blumenau".
export type ModoEndereco = 'endereco' | 'link'

export interface EntradaEndereco {
  modo: ModoEndereco
  street: string
  streetNumber: string
  neighborhood: string
  city: string
  mapsLink: string
  coords: { lat: number; lng: number } | null
}

export interface EnderecoResolvido {
  street: string
  street_number: string
  neighborhood: string
  city: string
  latitude: number | null
  longitude: number | null
  maps_link: string | null
}

// "s/n" é a convenção brasileira para endereço sem número, e é o que faz a
// linha do app ler como endereço de verdade em vez de placeholder técnico.
export const SEM_NUMERO = 's/n'

export function resolverEndereco(e: EntradaEndereco): EnderecoResolvido {
  if (e.modo === 'link') {
    return {
      street: e.street.trim(),
      street_number: SEM_NUMERO,
      // A coluna é NOT NULL e o app lê como String não-anulável; a cidade é o
      // dado mais próximo que existe e mantém a linha legível.
      neighborhood: e.neighborhood.trim() || e.city.trim(),
      city: e.city.trim(),
      // A coordenada vem do próprio link quando ele a carrega (o formulário
      // limpa `coords` ao trocar de modo, então aqui nunca é sobra da busca de
      // endereço). Sem ela a missão ainda funciona: o app abre maps_link.
      latitude: e.coords?.lat ?? null,
      longitude: e.coords?.lng ?? null,
      maps_link: e.mapsLink.trim(),
    }
  }

  return {
    street: e.street.trim(),
    street_number: e.streetNumber.trim(),
    neighborhood: e.neighborhood.trim(),
    city: e.city.trim(),
    latitude: e.coords?.lat ?? null,
    longitude: e.coords?.lng ?? null,
    maps_link: e.mapsLink.trim() || null,
  }
}

export function validarEndereco(e: EntradaEndereco): Record<string, string> {
  const erros: Record<string, string> = {}
  if (!e.city.trim()) erros.city = 'Campo obrigatório'

  if (e.modo === 'link') {
    if (!e.street.trim()) erros.street = 'Diga um ponto de referência'
    if (!e.mapsLink.trim()) erros.mapsLink = 'Cole o link do Maps'
    else if (!pareceLink(e.mapsLink)) erros.mapsLink = 'Isso não parece um link'
    return erros
  }

  if (!e.street.trim()) erros.street = 'Campo obrigatório'
  if (!e.streetNumber.trim()) erros.streetNumber = 'Campo obrigatório'
  if (!e.neighborhood.trim()) erros.neighborhood = 'Campo obrigatório'
  return erros
}

// ---------------------------------------------------------------------------
// Leitura do link do Maps
// ---------------------------------------------------------------------------
// Tudo aqui é "tenta, e se não der, tudo bem": devolver null é resultado
// legítimo, não erro. O link continua valendo mesmo sem coordenada nenhuma —
// o app do motorista abre maps_link antes de olhar lat/lng — então falhar em
// extrair não pode travar o formulário nem mostrar aviso vermelho.
//
// O link CURTO (maps.app.goo.gl), que é o que sai do botão compartilhar do
// celular, não carrega nada: só o redirecionamento revelaria o destino, e o
// navegador não consegue segui-lo (o domínio não manda CORS). Resolver isso
// exigiria uma edge function; por ora esses caem no preenchimento manual.

export interface DadosDoLink {
  coords: { lat: number; lng: number } | null
  nome: string | null
}

const PADROES_COORD: RegExp[] = [
  // Primeiro o ponto DO LUGAR. O `@` logo abaixo é o centro do mapa no momento
  // da cópia — coincide quase sempre, mas desvia se a pessoa arrastar o mapa
  // antes de copiar, e aí mandaria o motorista para a quadra vizinha.
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  /[?&](?:destination|query|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  /[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  /[?&]daddr=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
]

function coordPlausivel(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

export function lerLinkMaps(url: string): DadosDoLink {
  const u = (url ?? '').trim()
  if (!u) return { coords: null, nome: null }

  let coords: { lat: number; lng: number } | null = null
  for (const p of PADROES_COORD) {
    const m = u.match(p)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (coordPlausivel(lat, lng)) { coords = { lat, lng }; break }
    }
  }

  let nome: string | null = null
  const m = u.match(/\/maps\/place\/([^/@?]+)/)
  if (m) {
    try {
      const bruto = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim()
      // Coordenada crua como "nome" não ajuda ninguém a se localizar.
      if (bruto && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(bruto)) nome = bruto
    } catch {
      // URL malformada: seguir sem nome é melhor que estourar no formulário.
    }
  }

  return { coords, nome }
}

// ---------------------------------------------------------------------------
// Endereço colado
// ---------------------------------------------------------------------------
// O menu de compartilhar do Google Maps oferece DUAS coisas — "copiar link" e
// o endereço em texto — e a pessoa cola qualquer uma das duas no primeiro
// campo que vê. Recusar o endereço com "isso não parece um link" seria punir
// quem colou o dado mais completo dos dois: o texto traz rua, número, bairro,
// cidade e CEP, enquanto o link traz coordenada e nome.
//
// Formato que o Maps produz no Brasil:
//   {rua}, {número} - {bairro}, {cidade} - {UF}, {CEP}
// O CEP é opcional; o resto é estável.
const RE_ENDERECO_COLADO =
  /^\s*(.+?),\s*(\d+[A-Za-z]?|s\/n)\s*[-–]\s*([^,]+?),\s*([^,-]+?)\s*[-–]\s*([A-Za-z]{2})(?:\s*,\s*\d{5}-?\d{3})?\s*$/

export interface EnderecoColado {
  street: string
  streetNumber: string
  neighborhood: string
  city: string
}

export function lerEnderecoColado(texto: string): EnderecoColado | null {
  const t = (texto ?? '').trim()
  // Link é assunto de lerLinkMaps; sem este corte, uma URL com vírgulas na
  // parte de dados poderia casar por acidente.
  if (!t || /^https?:\/\//i.test(t)) return null
  const m = t.match(RE_ENDERECO_COLADO)
  if (!m) return null
  return {
    street: m[1].trim(),
    streetNumber: m[2].trim(),
    neighborhood: m[3].trim(),
    city: m[4].trim(),
  }
}

// Frouxo de propósito: aceita o que o app de mapas produz ao compartilhar
// (maps.app.goo.gl, google.com/maps, waze.com) sem virar um validador de URL
// que rejeita o link legítimo de alguém no meio da gincana.
export function pareceLink(v: string): boolean {
  const s = v.trim()
  if (!s) return false
  return /^https?:\/\/\S+\.\S+/i.test(s)
}
