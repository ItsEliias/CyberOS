import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  elevated?: boolean
  active?: boolean
  noPad?: boolean
  depth?: 1 | 2 | 3
}

const DEPTH_SHADOW: Record<1 | 2 | 3, string> = {
  1: 'var(--elevation-1)',
  2: 'var(--elevation-2)',
  3: 'var(--elevation-3)',
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ glass, elevated, active, noPad, depth = 1, className = '', children, style, ...rest }, ref) => {
    const pad = noPad ? '' : 'p-4'

    let bg: string
    let borderColor: string

    if (active) {
      bg = 'var(--surface-1)'
      borderColor = 'rgba(63,185,80,0.30)'
    } else if (glass) {
      bg = 'var(--surface-glass)'
      borderColor = 'var(--border-glass)'
    } else if (elevated) {
      bg = 'var(--surface-3)'
      borderColor = 'rgba(42,51,71,0.5)'
    } else {
      bg = 'var(--surface-1)'
      borderColor = 'var(--border-default)'
    }

    return (
      <div
        ref={ref}
        className={`rounded-md border transition-colors ${pad} ${className}`}
        style={{
          background: bg,
          borderColor,
          backdropFilter: glass ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: glass ? 'blur(12px)' : undefined,
          boxShadow: DEPTH_SHADOW[depth],
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Panel.displayName = 'Panel'
export default Panel
