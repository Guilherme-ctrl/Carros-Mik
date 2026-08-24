// "Todos os carros reportaram, mas ninguém encerrou ainda."
//
// Desde o encerramento manual (20260824000002) esse estado tem CUSTO: a missão
// segura os carros dela em on_mission e a fila de cada um não avança enquanto
// ela não for encerrada. Por isso ele precisa ser visível no painel, e não só
// dentro da solicitação aberta — foi a contrapartida acordada quando se
// decidiu não liberar o carro no momento do report.
//
// Derivado, sem coluna nova: é exatamente a condição que close_request exige
// para aceitar o encerramento.
export function isAwaitingClosure(
  status: string,
  cars: Array<{ outcome: string | null }>,
): boolean {
  return status === 'car_assigned' && cars.length > 0 && cars.every((c) => c.outcome !== null)
}
