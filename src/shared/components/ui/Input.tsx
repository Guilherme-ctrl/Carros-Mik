import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-on-surface-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full rounded-lg border bg-surface-2 px-3 text-sm text-on-surface placeholder:text-on-surface-disabled transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent',
          error ? 'border-status-unavailable' : 'border-surface-3 hover:border-on-surface-disabled',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-status-unavailable">{error}</p>}
    </div>
  )
}
