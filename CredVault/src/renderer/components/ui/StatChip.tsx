interface StatChipProps {
  label: string
  value: string | number
  color?: string
  mono?: boolean
  className?: string
}

export default function StatChip({
  label, value, color = 'var(--accent)', mono = false, className = '',
}: StatChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${className}`}
      style={{ background: `${color}0d`, borderColor: `${color}30` }}
    >
      <span className="text-[10px] text-text-muted">{label}</span>
      <span
        className={`text-xs font-semibold tabular-nums ${mono ? 'font-mono' : ''}`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}
