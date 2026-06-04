interface MetricCardProps {
  label: string
  value: number | string
  unit?: string
  delta?: string
  deltaUp?: boolean
  accentColor?: string
  className?: string
  icon?: React.ReactNode
  sublabel?: string
}

export default function MetricCard({
  label,
  value,
  unit = '',
  delta,
  deltaUp,
  accentColor = 'var(--accent)',
  className = '',
  icon,
  sublabel,
}: MetricCardProps) {
  const deltaColor = delta
    ? deltaUp === false ? '#f85149' : '#00ff41'
    : ''

  return (
    <div
      className={`rounded-md p-4 flex flex-col gap-1 ${className}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid rgba(0,255,65,0.15)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{icon}</span>}
      </div>

      <div className="flex items-end justify-between mt-1 gap-2">
        <div>
          <span className="flex items-baseline gap-0.5">
            <span
              className="text-2xl font-bold tabular-nums leading-none font-mono"
              style={{ color: accentColor, textShadow: `0 0 16px ${accentColor}55` }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm font-mono ml-0.5" style={{ color: 'var(--text-muted)' }}>{unit}</span>
            )}
          </span>
          {sublabel && (
            <p className="text-2xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
          )}
        </div>
      </div>

      {delta && (
        <p className="text-2xs font-mono mt-0.5" style={{ color: deltaColor }}>
          {deltaUp !== false ? '↑' : '↓'} {delta}
        </p>
      )}
    </div>
  )
}
