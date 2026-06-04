import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  elevated?: boolean
  active?: boolean
  noPad?: boolean
  depth?: 1 | 2 | 3 | 4
}

const depthShadow = {
  1: 'shadow-elevation-1',
  2: 'shadow-elevation-2',
  3: 'shadow-elevation-3',
  4: 'shadow-elevation-4',
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ glass, elevated, active, noPad, depth = 1, className = '', children, ...rest }, ref) => {
    const base = 'rounded-md border transition-colors duration-fast'
    const pad  = noPad ? '' : 'p-4'

    let surface: string
    let border: string
    let shadow: string

    if (active) {
      surface = 'bg-surface-1'
      border  = 'border-accent/30'
      shadow  = 'shadow-elevation-2 shadow-[0_0_0_1px_rgba(74,158,255,0.08)]'
    } else if (glass) {
      surface = 'bg-[rgba(13,14,24,0.72)] backdrop-blur-md'
      border  = 'border-white/[0.055]'
      shadow  = depthShadow[depth]
    } else if (elevated) {
      surface = 'bg-surface-3'
      border  = 'border-border-strong/40'
      shadow  = depthShadow[Math.min(depth + 1, 4) as 1 | 2 | 3 | 4]
    } else {
      surface = 'bg-surface-1'
      border  = 'border-border-default/75'
      shadow  = depthShadow[depth]
    }

    return (
      <div
        ref={ref}
        className={`${base} ${surface} ${border} ${shadow} ${pad} ${className}`}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Panel.displayName = 'Panel'
export default Panel
