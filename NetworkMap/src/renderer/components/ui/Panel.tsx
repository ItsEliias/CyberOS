import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  elevated?: boolean
  active?: boolean
  noPad?: boolean
  depth?: 1 | 2 | 3
}

const depthShadow = {
  1: '0 1px 3px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.35)',
  2: '0 4px 16px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.4)',
  3: '0 12px 40px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.45)',
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ glass, elevated, active, noPad, depth = 1, className = '', style, children, ...rest }, ref) => {
    let bg: string, border: string, shadow: string

    if (active) {
      bg = '#0d0e18'; border = 'rgba(255,140,66,0.30)'; shadow = depthShadow[2]
    } else if (glass) {
      bg = 'rgba(13,14,24,0.72)'; border = 'rgba(255,255,255,0.055)'; shadow = depthShadow[depth]
    } else if (elevated) {
      bg = '#191c32'; border = 'rgba(42,51,71,0.6)'; shadow = depthShadow[Math.min(depth + 1, 3) as 1|2|3]
    } else {
      bg = '#0d0e18'; border = 'rgba(42,51,71,0.75)'; shadow = depthShadow[depth]
    }

    return (
      <div
        ref={ref}
        className={`rounded-[10px] border transition-colors ${noPad ? '' : 'p-4'} ${className}`}
        style={{ background: bg, borderColor: border, boxShadow: shadow, ...style }}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Panel.displayName = 'Panel'
export default Panel
