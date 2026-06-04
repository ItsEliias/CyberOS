interface StatChipProps {
  label: string
  value: string | number
  color?: string
  mono?: boolean
  className?: string
}

export default function StatChip({
  label,
  value,
  color = 'var(--accent)',
  mono = false,
  className = '',
}: StatChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${className}`}
      style={{
        background: `rgba(45,212,191,0.06)`,
        borderColor: `rgba(45,212,191,0.20)`,
      }}
    >
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        className={`text-xs font-semibold tabular-nums ${mono ? 'font-mono' : ''}`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}
