import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize    = 'xs' | 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 hover:border-accent/50',
  ghost:   'bg-transparent border border-border-default/75 text-text-secondary hover:text-text-primary hover:bg-surface-2',
  danger:  'bg-[rgba(248,81,73,0.12)] border border-[rgba(248,81,73,0.3)] text-[#f85149] hover:bg-[rgba(248,81,73,0.2)]',
  subtle:  'bg-surface-2 border border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-3',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-[11px] rounded',
  sm: 'px-3 py-1   text-xs     rounded',
  md: 'px-4 py-1.5 text-sm     rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'sm', loading, disabled, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-1.5 font-medium transition-all duration-[150ms] cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...rest}
    >
      {loading ? <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
export default Button
