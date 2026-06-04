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
  primary: 'bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 hover:border-accent/50 active:bg-accent/35 active:scale-[0.97]',
  ghost:   'bg-transparent border border-border-default/75 text-text-secondary hover:text-text-primary hover:border-border-strong/60 hover:bg-surface-2 active:scale-[0.97]',
  danger:  'bg-[rgba(248,81,73,0.12)] border border-[rgba(248,81,73,0.3)] text-[#f85149] hover:bg-[rgba(248,81,73,0.2)] active:scale-[0.97]',
  subtle:  'bg-surface-2 border border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-3 active:scale-[0.97]',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1   text-2xs rounded-md',
  sm: 'px-3.5 py-1.5 text-xs  rounded-lg',
  md: 'px-5   py-2   text-sm  rounded-lg',
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
