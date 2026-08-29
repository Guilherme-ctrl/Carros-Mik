import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { AddressAutocompleteInput } from '../../shared/components/ui/AddressAutocompleteInput'
import { useLeaders } from '../leaders/useLeaders'
import { useRequests } from './useRequests'
import {
  lerEnderecoColado,
  lerLinkMaps,
  resolverEndereco,
  validarEndereco,
  type ModoEndereco,
} from './enderecoDaSolicitacao'

export function NewRequestPage() {
  const navigate = useNavigate()
  const { leaders, getLeaders } = useLeaders({ activeOnly: true })
  const { createRequest } = useRequests()

  // Dois jeitos de dizer onde é. O link cobre o caso comum de quem já tem o
  // lugar aberto no Maps e não quer transcrever endereço — o app do motorista
  // abre maps_link antes de olhar coordenada, então o link chega inteiro nele.
  const [modo, setModo] = useState<ModoEndereco>('endereco')
  // Se a referência foi digitada à mão, o link não a sobrescreve. Sem esta
  // marca, colar um segundo link apagaria o texto que a pessoa escreveu.
  const [refAutomatica, setRefAutomatica] = useState(false)
  // Avisa que o campo do link recebeu um endereço e o formulário se reorganizou
  // sozinho — sem isto a troca de modo pareceria bug.
  const [vindoDeEndereco, setVindoDeEndereco] = useState(false)
  const [event, setEvent] = useState('')
  const [stage, setStage] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  // Blumenau como ponto de partida porque é onde a maior parte acontece — mas
  // agora é um campo, não uma suposição enterrada no código do app.
  const [city, setCity] = useState('Blumenau')
  // Preenchidas só quando o endereço vem da busca. Digitação manual fica sem, e
  // aí o texto (agora com a cidade certa) volta a ser o que manda.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [objective, setObjective] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    getLeaders()
  }, [getLeaders])

  // Tenta ler coordenada e nome do link. Não achar é resultado normal — link
  // curto do celular não carrega nada — então aqui não há erro, aviso nem
  // bloqueio: o que der certo preenche, o resto a pessoa digita.
  function aoMudarLink(valor: string) {
    setMapsLink(valor)
    clearError('mapsLink')

    // O menu do Maps oferece "copiar link" E o endereço em texto. Quem colou o
    // endereço colou o dado mais completo dos dois — recusar seria punir o
    // acerto. Reconhecendo, o formulário se reorganiza para o modo endereço,
    // que é onde esses campos cabem.
    const end = lerEnderecoColado(valor)
    if (end) {
      setModo('endereco')
      setStreet(end.street)
      setStreetNumber(end.streetNumber)
      setNeighborhood(end.neighborhood)
      setCity(end.city)
      setMapsLink('')
      setCoords(null)
      setRefAutomatica(false)
      setVindoDeEndereco(true)
      setErrors({})
      return
    }

    const { coords: doLink, nome } = lerLinkMaps(valor)
    setCoords(doLink)
    if (nome && (refAutomatica || !street.trim())) {
      setStreet(nome)
      setRefAutomatica(true)
      clearError('street')
    }
  }

  function clearError(field: string) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!event.trim()) e.event = 'Campo obrigatório'
    if (!stage.trim()) e.stage = 'Campo obrigatório'
    if (!leaderId) e.leaderId = 'Selecione um líder'
    if (!objective.trim()) e.objective = 'Campo obrigatório'
    Object.assign(e, validarEndereco({
      modo, street, streetNumber, neighborhood, city, mapsLink, coords,
    }))
    return e
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      await createRequest({
        leader_id: leaderId,
        event: event.trim(),
        stage: stage.trim(),
        ...resolverEndereco({
          modo, street, streetNumber, neighborhood, city, mapsLink, coords,
        }),
        objective: objective.trim(),
        notes: notes.trim() || null,
      })
      toast.success('Solicitação aberta!')
      navigate('/requests')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao criar solicitação')
    } finally {
      setLoading(false)
    }
  }

  const textareaBase =
    'w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/requests')}>
            ← Voltar
          </Button>
          <h1 className="text-zinc-100 text-xl font-semibold">Nova Solicitação</h1>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-red-400 text-sm">{submitError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prova"
                placeholder="Ex: Busca histórica"
                value={event}
                onChange={(e) => { setEvent(e.target.value); clearError('event') }}
                error={errors.event}
                disabled={loading}
              />
              <Input
                label="Etapa"
                placeholder="Ex: 3"
                value={stage}
                onChange={(e) => { setStage(e.target.value); clearError('stage') }}
                error={errors.stage}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="leader" className="text-sm font-medium text-zinc-300">
                Líder
              </label>
              <select
                id="leader"
                value={leaderId}
                onChange={(e) => { setLeaderId(e.target.value); clearError('leaderId') }}
                disabled={loading}
                className={`h-9 w-full rounded-lg border bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-zinc-600 disabled:opacity-50 ${errors.leaderId ? 'border-red-500' : 'border-zinc-700'}`}
              >
                <option value="">— Selecione —</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.table_name ? ` (${l.table_name})` : ''}
                  </option>
                ))}
              </select>
              {errors.leaderId && <p className="text-xs text-red-400">{errors.leaderId}</p>}
            </div>

            {/* O líder às vezes já tem o lugar aberto no Maps e transcrever
                o endereço é o passo mais caro do formulário. Dois caminhos,
                escolhidos aqui em cima para o resto do bloco fazer sentido. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-300">Onde é</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['endereco', 'Tenho o endereço'],
                  ['link', 'Tenho o link do Maps'],
                ] as const).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => {
                      setModo(valor)
                      setErrors({})
                      // A coordenada pertence ao caminho que a produziu.
                      setCoords(null)
                      setRefAutomatica(false)
                      setVindoDeEndereco(false)
                    }}
                    disabled={loading}
                    aria-pressed={modo === valor}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                      modo === valor
                        ? 'border-[#E91E8C] bg-[#E91E8C]/10 text-zinc-100 font-medium'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>

            {modo === 'endereco' && vindoDeEndereco && (
              <p className="text-xs text-green-400">
                ✓ Reconheci um endereço no lugar do link — preenchi os campos abaixo.
              </p>
            )}

            {modo === 'link' ? (
              <>
                <Input
                  label="Link do Maps"
                  placeholder="Cole o link ou o endereço copiado do Maps"
                  value={mapsLink}
                  onChange={(e) => aoMudarLink(e.target.value)}
                  error={errors.mapsLink}
                  disabled={loading}
                />
                {/* Vai para a coluna `street`. O motorista lê isto na tela
                    dirigindo — um ponto de referência serve melhor que um
                    endereço completo, e mantém a linha do app legível. */}
                <Input
                  label="Ponto de referência"
                  placeholder="Ex: Posto Ipiranga da Rua XV"
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value)
                    setRefAutomatica(false)
                    clearError('street')
                  }}
                  error={errors.street}
                  disabled={loading}
                />
                <Input
                  label="Cidade"
                  placeholder="Ex: Blumenau"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); clearError('city') }}
                  error={errors.city}
                  disabled={loading}
                />
                {coords ? (
                  <p className="text-xs text-green-400">
                    ✓ Local exato lido do link — a missão já nasce com o ponto no mapa.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Link copiado da barra do navegador preenche a referência sozinho.
                    O link curto do celular não preenche — mas funciona igual: o
                    motorista abre ele direto no app de mapas.
                  </p>
                )}
              </>
            ) : (
              <>
            <AddressAutocompleteInput
              onSelect={({ street: s, neighborhood: n, city: c, latitude, longitude, houseNumber }) => {
                setStreet(s)
                setNeighborhood(n)
                clearError('street')
                clearError('neighborhood')
                if (c) { setCity(c); clearError('city') }
                setCoords(
                  latitude !== null && longitude !== null
                    ? { lat: latitude, lng: longitude }
                    : null,
                )
                // Só quando vier: o Nominatim devolve número apenas se o líder
                // digitou junto. Sobrescrever com vazio apagaria um número que
                // ele já tivesse preenchido à mão.
                if (houseNumber) {
                  setStreetNumber(houseNumber)
                  clearError('streetNumber')
                }
              }}
              disabled={loading}
            />

            {/* No celular a Rua ocupa a linha inteira: antes dividia a largura
                com o Número, e nome de rua não cabe em meia tela. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Rua"
                  placeholder="Nome da rua"
                  value={street}
                  onChange={(e) => { setStreet(e.target.value); clearError('street') }}
                  error={errors.street}
                  disabled={loading}
                />
              </div>
              <Input
                label="Número"
                placeholder="Ex: 100"
                // Abre o teclado numérico no celular. `type="number"` não serve:
                // engole entradas legítimas como "100A" e "s/n".
                inputMode="numeric"
                value={streetNumber}
                onChange={(e) => { setStreetNumber(e.target.value); clearError('streetNumber') }}
                error={errors.streetNumber}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bairro"
                placeholder="Nome do bairro"
                value={neighborhood}
                onChange={(e) => { setNeighborhood(e.target.value); clearError('neighborhood') }}
                error={errors.neighborhood}
                disabled={loading}
              />
              <Input
                label="Cidade"
                placeholder="Ex: Blumenau"
                value={city}
                onChange={(e) => { setCity(e.target.value); clearError('city') }}
                error={errors.city}
                disabled={loading}
              />
            </div>
              </>
            )}


            <div className="flex flex-col gap-1.5">
              <label htmlFor="objective" className="text-sm font-medium text-zinc-300">
                Objetivo
              </label>
              <textarea
                id="objective"
                rows={3}
                placeholder="Descreva o que precisa ser feito"
                value={objective}
                onChange={(e) => { setObjective(e.target.value); clearError('objective') }}
                disabled={loading}
                className={`${textareaBase} ${errors.objective ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600'}`}
              />
              {errors.objective && <p className="text-xs text-red-400">{errors.objective}</p>}
            </div>

            {/* Só quando a busca NÃO deu coordenada.
                Preencher isto no celular é sair do navegador, abrir o Maps,
                achar o lugar, compartilhar, copiar, voltar e colar — o passo
                mais caro do formulário. Ele existia para dar precisão ao
                motorista, e agora a coordenada da busca dá isso de graça. Some
                do caminho comum, mas continua sendo a saída de emergência de
                quem digitou o endereço à mão. */}
            {modo === 'endereco' && (coords ? (
              <p className="text-xs text-green-400">
                ✓ Local exato capturado da busca — o motorista vai navegar direto
                para cá.
              </p>
            ) : (
              <Input
                label="Link Maps (opcional)"
                placeholder="https://maps.google.com/..."
                value={mapsLink}
                onChange={(e) => setMapsLink(e.target.value)}
                disabled={loading}
              />
            ))}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-zinc-300">
                Observações (opcional)
              </label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Informações adicionais"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className={`${textareaBase} border-zinc-700 hover:border-zinc-600`}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/requests')}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Abrir solicitação
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
