import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
type ButtonSize    = 'xs' | 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANTS: Record<ButtonVariant, React.CSSProperties & { className?: string }> = {
  primary: {} as any,
  ghost:   {} as any,
  danger:  {} as any,
  subtle:  {} as any,
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; border: string; color: string; hoverBg: string }> = {
  primary: {
    bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.30)',
    color: '#3fb950', hoverBg: 'rgba(63,185,80,0.20)',
  },
  ghost: {
    bg: 'transparent', border: 'rgba(42,51,71,0.75)',
    color: '#8b949e', hoverBg: 'rgba(255,255,255,0.04)',
  },
  danger: {
    bg: 'rgba(248,81,73,0.10)', border: 'rgba(248,81,73,0.28)',
    color: '#f85149', hoverBg: 'rgba(248,81,73,0.18)',
  },
  subtle: {
    bg: 'var(--surface-2)', border: 'transparent',
    color: '#484f58', hoverBg: 'var(--surface-3)',
  },
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-0.5 text-[10px] rounded-lg',
  sm: 'px-3 py-1 text-xs rounded-lg',
  md: 'px-4 py-1.5 text-sm rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'sm', loading, disabled, className = '', children, style, ...rest }, ref) => {
    const vs = VARIANT_STYLES[variant]
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center gap-1.5 font-medium border transition-all cursor-pointer
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:-translate-y-px active:translate-y-0
          ${SIZES[size]} ${className}
        `}
        style={{
          background: vs.bg,
          borderColor: vs.border,
          color: vs.color,
          fontFamily: 'var(--font-display)',
          transitionDuration: '150ms',
          ...style,
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.background = vs.hoverBg;
          el.style.boxShadow = variant === 'primary'
            ? '0 0 12px rgba(63,185,80,0.20)'
            : variant === 'danger'
            ? '0 0 10px rgba(248,81,73,0.15)'
            : '';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = vs.bg;
          el.style.boxShadow = '';
        }}
        {...rest}
      >
        {loading && (
          <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
