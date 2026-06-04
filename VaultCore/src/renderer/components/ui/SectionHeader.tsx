interface SectionHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  accent?: string
  className?: string
}

export default function SectionHeader({
  title,
  subtitle,
  actions,
  accent = 'var(--accent)',
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-px h-5 rounded-full flex-shrink-0"
          style={{ background: accent }}
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
