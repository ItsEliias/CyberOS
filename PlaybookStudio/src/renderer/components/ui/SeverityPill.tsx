type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

const SEV: Record<Severity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: 'rgba(248,81,73,0.12)',  text: '#f85149', border: 'rgba(248,81,73,0.3)'  },
  high:     { label: 'High',     bg: 'rgba(255,140,66,0.12)', text: '#ff8c42', border: 'rgba(255,140,66,0.3)' },
  medium:   { label: 'Medium',   bg: 'rgba(210,153,34,0.12)', text: '#d29922', border: 'rgba(210,153,34,0.3)' },
  low:      { label: 'Low',      bg: 'rgba(74,158,255,0.12)', text: '#4a9eff', border: 'rgba(74,158,255,0.3)' },
  info:     { label: 'Info',     bg: 'rgba(139,148,158,0.12)',text: '#8b949e', border: 'rgba(139,148,158,0.3)' },
}

interface SeverityPillProps {
  severity: Severity
  className?: string
  showDot?: boolean
}

export default function SeverityPill({ severity, className = '', showDot = true }: SeverityPillProps) {
  const s = SEV[severity]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${className}`}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {showDot && <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: s.text }} />}
      {s.label}
    </span>
  )
}
