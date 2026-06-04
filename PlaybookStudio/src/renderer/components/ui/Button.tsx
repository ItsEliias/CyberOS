import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize    = 'xs' | 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANTS: Record<ButtonVariant, React.CSSProperties & { hoverStyle?: string }> = {
  primary: {},
  ghost:   {},
  danger:  {},
  subtle:  {},
}

const VARIANT_STYLES: Record<ButtonVariant, { base: string }> = {
  primary: { base: 'border transition-all font-medium' },
  ghost:   { base: 'border transition-all font-medium' },
  danger:  { base: 'border transition-all font-medium' },
  subtle:  { base: 'border border-transparent transition-all font-medium' },
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-xs rounded',
  sm: 'px-3 py-1 text-xs rounded',
  md: 'px-4 py-1.5 text-sm rounded-md',
}

const VARIANT_INLINE: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'rgba(45,212,191,0.12)',
    borderColor: 'rgba(45,212,191,0.30)',
    color: '#2dd4bf',
  },
  ghost: {
    background: 'transparent',
    borderColor: 'rgba(42,51,71,0.75)',
    color: '#8b949e',
  },
  danger: {
    background: 'rgba(248,81,73,0.10)',
    borderColor: 'rgba(248,81,73,0.28)',
    color: '#f85149',
  },
  subtle: {
    background: '#131525',
    borderColor: 'transparent',
    color: '#484f58',
  },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'sm', loading, disabled, className = '', children, style, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-1.5 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variant === 'primary' ? 'btn-teal-glow' : ''}
        ${VARIANT_STYLES[variant].base} ${SIZES[size]} ${className}
      `}
      style={{ ...VARIANT_INLINE[variant], ...style }}
      {...rest}
    >
      {loading ? <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
export default Button
