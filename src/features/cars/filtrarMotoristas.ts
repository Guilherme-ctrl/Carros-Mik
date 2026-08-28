import type { DriverUser } from './useCars'

// Tira acento e caixa para comparar. Sem isto, quem procura "jose" não acha
// "José" e quem procura "Cassiano" não acha "Cássiano" — com dezenas de nomes
// brasileiros na lista isso deixa de ser detalhe e vira "o sistema não acha a
// pessoa". A Mesa digita rápido e sem acento.
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

// Busca por nome OU e-mail: a Mesa às vezes tem só um dos dois na mão.
// Cada termo digitado precisa aparecer em algum dos dois campos, então
// "ana silva" acha "Ana Flávia da Silva" mesmo com palavras no meio.
export function filtrarMotoristas(users: DriverUser[], query: string): DriverUser[] {
  const termos = normalizar(query).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return users

  return users.filter((u) => {
    const alvo = `${normalizar(u.display_name)} ${normalizar(u.email)}`
    return termos.every((t) => alvo.includes(t))
  })
}
