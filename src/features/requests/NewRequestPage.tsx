import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { AddressAutocompleteInput } from '../../shared/components/ui/AddressAutocompleteInput'
import { useLeaders } from '../leaders/useLeaders'
import { useRequests } from './useRequests'

export function NewRequestPage() {
  const navigate = useNavigate()
  const { leaders, getLeaders } = useLeaders({ activeOnly: true })
  const { createRequest } = useRequests()

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
    if (!street.trim()) e.street = 'Campo obrigatório'
    if (!streetNumber.trim()) e.streetNumber = 'Campo obrigatório'
    if (!neighborhood.trim()) e.neighborhood = 'Campo obrigatório'
    if (!city.trim()) e.city = 'Campo obrigatório'
    if (!objective.trim()) e.objective = 'Campo obrigatório'
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
        street: street.trim(),
        street_number: streetNumber.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        objective: objective.trim(),
        maps_link: mapsLink.trim() || null,
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
            {coords ? (
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
            )}

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
