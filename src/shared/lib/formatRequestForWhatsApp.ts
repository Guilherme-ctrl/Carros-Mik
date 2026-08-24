import type { RequestWithLeader } from '../../features/dashboard/useAllRequests'

export function formatRequestForWhatsApp(request: RequestWithLeader): string {
  const leaderName  = request.leaders?.name  ?? 'Não informado'
  const leaderPhone = request.leaders?.phone ?? 'Não informado'
  // O campo maps_link deixou de ser preenchido no caminho comum (a busca de
  // endereço já entrega a coordenada), então "Não informado" passaria a ser a
  // resposta quase sempre. Com a coordenada dá para montar o link — e ele é
  // melhor que o colado à mão: aponta o ponto exato, não um resultado de busca.
  const mapsLink =
    request.maps_link ??
    (request.latitude !== null && request.longitude !== null
      ? `https://maps.google.com/?q=${request.latitude},${request.longitude}`
      : 'Não informado')

  return [
    `Prova: ${request.event}`,
    '',
    `Nome Líder: ${leaderName}`,
    `Telefone: ${leaderPhone}`,
    '',
    // A cidade entra aqui também: quem recebe o endereço por WhatsApp precisa
    // saber se é Blumenau ou Gaspar tanto quanto o app de navegação precisava.
    `Endereço: ${request.street}, ${request.street_number} - ${request.neighborhood}`
      + (request.city ? `, ${request.city}` : ''),
    `Maps: ${mapsLink}`,
    '',
    `Objetivo: ${request.objective}`,
  ].join('\n')
}
