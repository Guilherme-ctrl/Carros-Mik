import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'md' && 'px-4 py-2 text-sm h-10',
        size === 'sm' && 'px-3 py-1.5 text-xs h-7',
        variant === 'primary'   && 'bg-brand-pink text-white hover:bg-brand-pink-dark shadow-[0_4px_16px_rgba(233,30,140,0.35)]',
        variant === 'secondary' && 'border border-brand-pink text-brand-pink hover:bg-brand-pink-muted bg-transparent',
        variant === 'ghost'     && 'text-on-surface-muted hover:text-on-surface hover:bg-surface-2',
        variant === 'danger'    && 'bg-status-unavailable/10 text-status-unavailable hover:bg-status-unavailable/20',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
