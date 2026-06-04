import { ResponsiveContainer } from 'recharts'

interface ChartFrameProps {
  title?: string
  subtitle?: string
  height?: number | string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
  noPad?: boolean
}

export default function ChartFrame({
  title,
  subtitle,
  height = 180,
  children,
  actions,
  className = '',
  noPad,
}: ChartFrameProps) {
  return (
    <div
      className={`bg-surface-1 border border-border-default/75 rounded-md shadow-elevation-2 ${noPad ? '' : 'p-4'} ${className}`}
    >
      {(title || actions) && (
        <div className={`flex items-start justify-between gap-4 ${noPad ? 'px-4 pt-4' : ''} mb-3`}>
          {title && (
            <div>
              <p className="text-xs font-semibold text-text-secondary">{title}</p>
              {subtitle && <p className="text-2xs text-text-muted mt-0.5">{subtitle}</p>}
            </div>
          )}
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div style={{ height }} className={noPad ? 'px-4 pb-4' : ''}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
