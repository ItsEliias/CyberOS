interface MetricCardProps {
  label: string
  value: number
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
    ? deltaUp === false ? 'text-[#f85149]' : 'text-[#3fb950]'
    : ''

  return (
    <div
      className={`bg-surface-1 border border-border-default/75 rounded-md p-4 shadow-elevation-2 flex flex-col gap-1 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-widest text-text-muted">
          {label}
        </span>
        {icon && <span className="text-text-muted opacity-60">{icon}</span>}
      </div>

      <div className="flex items-end mt-1 gap-2">
        <span className="flex items-baseline gap-0.5">
          <span
            className="text-2xl font-bold tabular-nums leading-none"
            style={{
              color: accentColor,
              textShadow: `0 0 16px ${accentColor}55, 0 0 32px ${accentColor}22`,
            }}
          >
            {value}
          </span>
          {unit && (
            <span className="text-sm font-mono text-text-muted ml-0.5">{unit}</span>
          )}
        </span>
      </div>

      {sublabel && (
        <p className="text-2xs text-text-muted mt-0.5 font-mono">{sublabel}</p>
      )}

      {delta && (
        <p className={`text-2xs font-mono mt-0.5 ${deltaColor}`}>
          {deltaUp !== false ? '↑' : '↓'} {delta}
        </p>
      )}
    </div>
  )
}
