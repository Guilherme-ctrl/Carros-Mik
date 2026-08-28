import { describe, expect, it } from 'vitest'
import { filtrarMotoristas, normalizar } from '../filtrarMotoristas'
import type { DriverUser } from '../useCars'

const u = (id: string, display_name: string, email: string): DriverUser => ({
  id,
  display_name,
  email,
})

// Nomes reais do tipo que está na lista da gincana — com acento, compostos e
// dois "Ana Flávia" diferentes, que é o caso que quebra busca por primeiro nome.
const USERS: DriverUser[] = [
  u('1', 'Agnner Cassiano Baronis da Silva', 'ag.mikdundee@gmail.com'),
  u('2', 'Ana Flávia Gomes Sobrinho', 'aninha002@live.com'),
  u('3', 'Ana Flávia da Silva', 'a.flavias02019@gmail.com'),
  u('4', 'José Roberto Hermes', 'robertohermesdesouza@gmail.com'),
  u('5', 'Matheus Freiberger Rosa', 'matheus.rosa.f@gmail.com'),
]

const ids = (r: DriverUser[]) => r.map((x) => x.id)

describe('normalizar', () => {
  it('remove acento e caixa', () => {
    expect(normalizar('José Flávia ÁÉÍÓÚ')).toBe('jose flavia aeiou')
  })

  it('remove espaço nas pontas', () => {
    expect(normalizar('  Ana  ')).toBe('ana')
  })
})

describe('filtrarMotoristas', () => {
  it('devolve tudo quando a busca está vazia', () => {
    expect(filtrarMotoristas(USERS, '')).toHaveLength(5)
    expect(filtrarMotoristas(USERS, '   ')).toHaveLength(5)
  })

  it('acha por nome, ignorando caixa', () => {
    expect(ids(filtrarMotoristas(USERS, 'MATHEUS'))).toEqual(['5'])
  })

  it('acha nome acentuado com busca sem acento', () => {
    // O caso que motivou o normalizar: ninguém digita "José" com acento.
    expect(ids(filtrarMotoristas(USERS, 'jose'))).toEqual(['4'])
    expect(ids(filtrarMotoristas(USERS, 'flavia'))).toEqual(['2', '3'])
  })

  it('acha por e-mail', () => {
    expect(ids(filtrarMotoristas(USERS, 'aninha002'))).toEqual(['2'])
    expect(ids(filtrarMotoristas(USERS, 'mikdundee'))).toEqual(['1'])
  })

  it('combina termos soltos, mesmo com palavras no meio', () => {
    // "Ana Flávia da Silva" — o "da" fica entre os dois termos buscados.
    expect(ids(filtrarMotoristas(USERS, 'ana silva'))).toEqual(['3'])
  })

  it('cruza nome e e-mail no mesmo termo', () => {
    expect(ids(filtrarMotoristas(USERS, 'roberto hermes'))).toEqual(['4'])
  })

  it('devolve vazio quando não acha', () => {
    expect(filtrarMotoristas(USERS, 'xyz')).toEqual([])
  })

  it('não confunde nomes parecidos', () => {
    // Duas Ana Flávia: só o e-mail as separa.
    expect(ids(filtrarMotoristas(USERS, 'ana flavia'))).toEqual(['2', '3'])
    expect(ids(filtrarMotoristas(USERS, 'ana flavia live'))).toEqual(['2'])
  })
})
