import type { RequestWithLeader } from '../../features/dashboard/useAllRequests'

export function formatRequestForWhatsApp(request: RequestWithLeader): string {
  const leaderName  = request.leaders?.name  ?? 'Não informado'
  const leaderPhone = request.leaders?.phone ?? 'Não informado'
  const mapsLink    = request.maps_link      ?? 'Não informado'

  return [
    `Prova: ${request.event}`,
    '',
    `Nome Líder: ${leaderName}`,
    `Telefone: ${leaderPhone}`,
    '',
    `Endereço: ${request.street}, ${request.street_number} - ${request.neighborhood}`,
    `Maps: ${mapsLink}`,
    '',
    `Objetivo: ${request.objective}`,
  ].join('\n')
}
