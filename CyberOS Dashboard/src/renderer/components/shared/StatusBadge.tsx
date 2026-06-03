// CyberOS Dashboard — Status Badge Component

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'warning' | 'error' | 'locked' | 'running'
  label?: string
}

const statusConfig = {
  active: { color: 'bg-success', textColor: 'text-success', label: 'Active', pulse: true },
  inactive: { color: 'bg-text-muted', textColor: 'text-text-muted', label: 'Inactive', pulse: false },
  warning: { color: 'bg-warning', textColor: 'text-warning', label: 'Warning', pulse: false },
  error: { color: 'bg-danger', textColor: 'text-danger', label: 'Error', pulse: false },
  locked: { color: 'bg-warning', textColor: 'text-warning', label: 'Locked', pulse: false },
  running: { color: 'bg-success', textColor: 'text-success', label: 'Running', pulse: true },
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = statusConfig[status]
  const displayLabel = label ?? cfg.label

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cfg.textColor}`}
      style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.color} ${cfg.pulse ? 'animate-[statusPulse_2s_ease-out_infinite]' : ''}`} />
      {displayLabel}
    </span>
  )
}
