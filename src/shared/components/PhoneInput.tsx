import { formatPhoneForStorage, stripPhonePrefix } from '../utils/phone'

function maskDigits(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2)}`
  if (d.length <= 10) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`
}

interface Props {
  label?: string
  value: string
  onChange: (stored: string) => void
  onError?: (message: string | null) => void
  required?: boolean
  disabled?: boolean
}

export function PhoneInput({ label, value, onChange, onError, required, disabled }: Props) {
  const displayValue = maskDigits(stripPhonePrefix(value))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits ? formatPhoneForStorage(digits) : '')
  }

  function handleBlur() {
    if (!onError) return
    const digits = stripPhonePrefix(value)
    onError(digits.length > 0 && digits.length < 10 ? 'Telefone inválido.' : null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-on-surface-muted">{label}</label>
      )}
      <div className="flex h-10 w-full rounded-lg border border-surface-3 hover:border-on-surface-disabled bg-surface-2 overflow-hidden focus-within:ring-2 focus-within:ring-brand-pink focus-within:border-transparent transition-colors">
        <span className="flex items-center pl-3 pr-1 text-sm text-on-surface-disabled select-none shrink-0">
          +55
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder="49 99999-9999"
          className="flex-1 bg-transparent py-2 pr-3 text-sm text-on-surface placeholder:text-on-surface-disabled focus:outline-none disabled:opacity-50"
        />
      </div>
    </div>
  )
}
