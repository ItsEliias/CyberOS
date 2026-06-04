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
  primary: 'bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 hover:border-accent/50 active:bg-accent/35',
  ghost:   'bg-transparent border border-[rgba(0,255,65,0.2)] text-[#7abf7a] hover:text-[#c8ffc8] hover:border-[rgba(0,255,65,0.35)] hover:bg-[rgba(0,255,65,0.05)]',
  danger:  'bg-[rgba(248,81,73,0.12)] border border-[rgba(248,81,73,0.3)] text-[#f85149] hover:bg-[rgba(248,81,73,0.2)]',
  subtle:  'bg-[rgba(0,255,65,0.04)] border border-transparent text-[#3d6b3d] hover:text-[#7abf7a] hover:bg-[rgba(0,255,65,0.08)]',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-2xs rounded-xs',
  sm: 'px-3 py-1   text-xs  rounded-sm',
  md: 'px-4 py-1.5 text-sm  rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'sm', loading, disabled, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-1.5 font-medium font-mono transition-all cursor-pointer
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
