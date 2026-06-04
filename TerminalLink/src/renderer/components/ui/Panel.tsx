import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  elevated?: boolean
  active?: boolean
  noPad?: boolean
  depth?: 1 | 2 | 3
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ glass, elevated, active, noPad, depth = 1, className = '', children, style, ...rest }, ref) => {
    const pad = noPad ? '' : 'p-4'

    const depthShadow = depth === 1
      ? 'var(--elevation-1)'
      : depth === 2 ? 'var(--elevation-2)' : 'var(--elevation-3)'

    let bg: string
    let border: string

    if (active) {
      bg = 'var(--surface-2)'
      border = 'rgba(0,255,65,0.3)'
    } else if (glass) {
      bg = 'var(--surface-glass)'
      border = 'var(--border-glass)'
    } else if (elevated) {
      bg = 'var(--surface-3)'
      border = 'rgba(0,255,65,0.15)'
    } else {
      bg = 'var(--surface-1)'
      border = 'var(--border-default)'
    }

    return (
      <div
        ref={ref}
        className={`rounded-md transition-colors ${pad} ${className}`}
        style={{ background: bg, border: `1px solid ${border}`, boxShadow: depthShadow, ...style }}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Panel.displayName = 'Panel'
export default Panel
