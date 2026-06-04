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
  primary: [
    'bg-accent/15 border border-accent/30 text-accent',
    'hover:bg-accent/25 hover:border-accent/60 hover:shadow-[0_0_14px_rgba(180,79,255,0.35)]',
    'active:bg-accent/35 active:scale-[0.97]',
  ].join(' '),
  ghost: [
    'bg-transparent border border-border-default/75 text-text-secondary',
    'hover:text-text-primary hover:border-accent/40 hover:bg-surface-2 hover:shadow-[0_0_10px_rgba(180,79,255,0.15)]',
    'active:scale-[0.97]',
  ].join(' '),
  danger: [
    'bg-[rgba(248,81,73,0.12)] border border-[rgba(248,81,73,0.3)] text-[#f85149]',
    'hover:bg-[rgba(248,81,73,0.22)] hover:shadow-[0_0_12px_rgba(248,81,73,0.3)]',
    'active:scale-[0.97]',
  ].join(' '),
  subtle: [
    'bg-surface-2 border border-transparent text-text-muted',
    'hover:text-text-secondary hover:bg-surface-3 hover:border-border-default/40',
    'active:scale-[0.97]',
  ].join(' '),
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-0.5 text-2xs rounded-[6px]',
  sm: 'px-3    py-1   text-xs  rounded-[8px]',
  md: 'px-4    py-1.5 text-sm  rounded-[10px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'sm', loading, disabled, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-1.5 font-medium
        transition-all duration-[200ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]
        cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
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
