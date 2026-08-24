import type { AssignMode } from './useAssignCar'

interface Props {
  carLabel: string
  onSelect: (mode: AssignMode) => void
  disabled?: boolean
}

// FR2.1/FILA-ADR-4 — when the target car is already running a mission, the
// operator makes an EXPLICIT choice; the system never picks for them
// (ADR-4: a busy car is never silently stolen).
//
// REESCRITO — achado ao vivo (feedback direto sobre a versão em popup): a
// versão anterior escondia as 2 opções atrás de um botão "Confirmar" que
// abria um submenu — um "clique de confirmação" a mais, sem nenhuma pista
// visual de que havia algo escondido ali. Agora as 2 opções são botões
// explícitos, sempre visíveis, lado a lado — sem estado de aberto/fechado,
// sem popup dentro de popup.
export function EnqueueOrTransferMenu({ carLabel, onSelect, disabled }: Props) {
  return (
    <div className="flex-1 grid grid-cols-2 gap-2">
      <ChoiceButton
        testId="assignment-mode-enqueue"
        variant="secondary"
        title="Enfileirar"
        hint={`Entra na fila do ${carLabel}, sem tirá-lo da missão atual`}
        onClick={() => onSelect('enqueue')}
        disabled={disabled}
      />
      <ChoiceButton
        testId="assignment-mode-transfer"
        variant="primary"
        title="Transferir agora"
        hint={`Remove o ${carLabel} da missão atual imediatamente`}
        onClick={() => onSelect('transfer')}
        disabled={disabled}
      />
    </div>
  )
}

function ChoiceButton({
  testId, variant, title, hint, onClick, disabled,
}: {
  testId: string
  variant: 'primary' | 'secondary'
  title: string
  hint: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === 'primary'
          ? 'border-brand-pink bg-brand-pink text-white hover:bg-brand-pink-dark shadow-[0_4px_16px_rgba(233,30,140,0.35)]'
          : 'border-brand-pink text-brand-pink hover:bg-brand-pink-muted bg-transparent'
      }`}
    >
      <span className="text-xs font-semibold">{title}</span>
      <span className={`text-[11px] leading-snug ${variant === 'primary' ? 'text-white/80' : 'text-brand-pink/80'}`}>
        {hint}
      </span>
    </button>
  )
}
