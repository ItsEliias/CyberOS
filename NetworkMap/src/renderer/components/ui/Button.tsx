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
  primary: 'border border-[rgba(255,140,66,0.30)] text-[#ff8c42] hover:border-[rgba(255,140,66,0.5)]',
  ghost:   'bg-transparent border border-[rgba(42,51,71,0.75)] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#131525]',
  danger:  'bg-[rgba(248,81,73,0.12)] border border-[rgba(248,81,73,0.3)] text-[#f85149] hover:bg-[rgba(248,81,73,0.2)]',
  subtle:  'bg-[#131525] border border-transparent text-[#484f58] hover:text-[#8b949e] hover:bg-[#191c32]',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-[0.6875rem] rounded-[4px]',
  sm: 'px-3 py-1   text-xs  rounded-[6px]',
  md: 'px-4 py-1.5 text-sm  rounded-[10px]',
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
      style={variant === 'primary' ? { background: 'rgba(255,140,66,0.12)' } : undefined}
      {...rest}
    >
      {loading ? <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
export default Button
