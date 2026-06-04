import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  elevated?: boolean
  active?: boolean
  noPad?: boolean
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ glass, elevated, active, noPad, className = '', children, style, ...rest }, ref) => {
    const pad = noPad ? '' : 'p-4'

    let bg: string
    let border: string

    if (active) {
      bg = '#0d0e18'
      border = 'rgba(45,212,191,0.30)'
    } else if (glass) {
      bg = 'rgba(13,14,24,0.72)'
      border = 'rgba(255,255,255,0.055)'
    } else if (elevated) {
      bg = '#191c32'
      border = 'rgba(42,51,71,0.6)'
    } else {
      bg = '#0d0e18'
      border = 'rgba(42,51,71,0.75)'
    }

    return (
      <div
        ref={ref}
        className={`rounded-md border ${pad} ${className}`}
        style={{ background: bg, borderColor: border, ...style }}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Panel.displayName = 'Panel'
export default Panel
