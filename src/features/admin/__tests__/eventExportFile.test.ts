import { describe, expect, it, vi } from 'vitest'
import { inflateRawSync } from 'node:zlib'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import writeXlsxFileNode from 'write-excel-file/node'

vi.mock('../../../lib/supabase', () => ({ supabase: {} }))

import { buildSheets, type EventSnapshot } from '../eventExport'

// Os testes vizinhos provam o CONTEÚDO das abas. Este prova que a biblioteca
// aceita esse conteúdo e cospe um arquivo — que é onde mora o outro tipo de
// falha: uma célula com tipo inválido, um nome de aba proibido, uma aba vazia.
// Nada disso aparece em asserção sobre arrays; só na hora de gerar, que em
// contingência é o pior momento para descobrir.
//
// Usa o build /node (o app usa /browser): mesma engine de escrita, mas grava em
// disco em vez de disparar download.
const EMPTY: EventSnapshot = {
  requests: [], cars: [], leaders: [], priorities: {}, queue: [], comments: [],
}

async function write(snap: EventSnapshot): Promise<Buffer> {
  const sheets = buildSheets(snap)
  const dir = mkdtempSync(join(tmpdir(), 'carros-export-'))
  const file = join(dir, 'export.xlsx')
  await writeXlsxFileNode(
    sheets.map((s) => ({ sheet: s.name, data: s.rows })),
  ).toFile(file)
  return readFileSync(file)
}

// Leitor de zip mínimo. Existe porque a asserção que importa — "as abas saíram
// com os nomes certos?" — só é possível ABRINDO o arquivo, e um .xlsx é um zip
// com os XMLs deflacionados. Sem isto, o bug que passou aqui (a chave do nome
// da aba é `sheet`, não `name`; com `name` o arquivo sai com "Sheet1".."Sheet6"
// e nenhum teste de array percebe) volta na próxima atualização da lib.
function readZipEntry(zip: Buffer, wanted: string): string | null {
  // Lê pelo DIRETÓRIO CENTRAL, não pelos cabeçalhos locais. Esta biblioteca
  // escreve com data descriptor (bit 3 das flags), o que deixa o tamanho
  // comprimido zerado no cabeçalho local — inflar a partir dali dá
  // "unexpected end of file". O diretório central sempre tem os tamanhos reais.
  let eocd = zip.length - 22
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) return null

  const count  = zip.readUInt16LE(eocd + 10)
  let   offset = zip.readUInt32LE(eocd + 16)

  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) return null
    const method     = zip.readUInt16LE(offset + 10)
    const compressed = zip.readUInt32LE(offset + 20)
    const nameLen    = zip.readUInt16LE(offset + 28)
    const extraLen   = zip.readUInt16LE(offset + 30)
    const commentLen = zip.readUInt16LE(offset + 32)
    const localAt    = zip.readUInt32LE(offset + 42)
    const name       = zip.subarray(offset + 46, offset + 46 + nameLen).toString('utf8')

    if (name === wanted) {
      // Os comprimentos de nome/extra do cabeçalho LOCAL podem diferir dos do
      // diretório central, então o início dos dados é lido de lá.
      const lNameLen  = zip.readUInt16LE(localAt + 26)
      const lExtraLen = zip.readUInt16LE(localAt + 28)
      const start     = localAt + 30 + lNameLen + lExtraLen
      const data      = zip.subarray(start, start + compressed)
      return method === 0 ? data.toString('utf8') : inflateRawSync(data).toString('utf8')
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  return null
}

describe('geração do arquivo .xlsx', () => {
  it('escreve um xlsx válido a partir de um evento vazio', async () => {
    // O caso que mais provavelmente quebra: evento recém-criado, tudo vazio.
    // Uma aba sem nenhuma linha faz a biblioteca reclamar.
    const buf = await write(EMPTY)
    // Assinatura de ZIP — xlsx é um zip.
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('escreve um xlsx válido com dados reais de um evento em andamento', async () => {
    const snap: EventSnapshot = {
      ...EMPTY,
      cars: [{
        id: 'car-a', number: '01', pilot_name: 'Guilherme', pilot_phone: '47999368732',
        copilot_name: null, copilot_phone: null, operational_status: 'on_mission',
      }],
      leaders: [{ name: 'Ana', phone: '4790000001', table_name: 'Mesa 3' }],
      requests: [{
        id: 'r1', event: 'Buscar Cachorro', stage: '1', street: 'Rua XV',
        street_number: '100', neighborhood: 'Centro',
        city: 'Blumenau', objective: 'Busca',
        notes: null, status: 'car_assigned', outcome: null,
        created_at: '2026-08-24T13:00:00Z', updated_at: '2026-08-24T13:30:00Z',
        leaders: { name: 'Ana', phone: '4790000001', table_name: 'Mesa 3' },
        request_cars: [{
          car_id: 'car-a', status: 'on_site', outcome: 'found', is_current: true,
          removed_at: null,
          cars: {
            id: 'car-a', number: '01', pilot_name: 'Guilherme', pilot_phone: '47999368732',
            copilot_name: null, copilot_phone: null, operational_status: 'on_mission',
          },
        }],
      }],
      comments: [{ request_id: 'r1', author_name: 'Guilherme', content: 'Cheguei', created_at: '2026-08-24T13:20:00Z' }],
    }
    const buf = await write(snap)
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('nomeia as abas com os nomes de verdade, não Sheet1..Sheet6', async () => {
    const workbook = readZipEntry(await write(EMPTY), 'xl/workbook.xml')
    expect(workbook).not.toBeNull()

    const names = [...workbook!.matchAll(/<sheet[^>]*\sname="([^"]+)"/g)].map((m) => m[1])
    expect(names).toEqual([
      'Missões ativas', 'Fila por carro', 'Carros', 'Líderes', 'Mensagens', 'Encerradas',
    ])
  })
})
