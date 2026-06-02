interface MetricGaugeProps {
  label: string
  value: number     // 0–100
  active: boolean
  color: string
  sublabel?: string
}

const R = 26
const CIRC = 2 * Math.PI * R

export default function MetricGauge({ label, value, active, color, sublabel }: MetricGaugeProps) {
  const pct    = Math.max(0, Math.min(100, value))
  const offset = CIRC * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center gap-2 px-2 py-3 bg-panel border border-border rounded-lg flex-1 min-w-0">
      {/* Circular gauge */}
      <div className="relative flex-shrink-0">
        <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden>
          {/* Glow backdrop when active */}
          {active && (
            <circle cx="34" cy="34" r={R + 4} fill={color} fillOpacity="0.06" />
          )}
          {/* Track */}
          <circle cx="34" cy="34" r={R} fill="none" stroke="#30363d" strokeWidth="5" />
          {/* Progress arc */}
          <circle
            cx="34" cy="34" r={R}
            fill="none"
            stroke={active ? color : '#30363d'}
            strokeWidth="5"
            strokeDasharray={CIRC}
            strokeDashoffset={active ? offset : CIRC}
            strokeLinecap="round"
            transform="rotate(-90 34 34)"
            style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.3s' }}
          />
          {/* Center dot */}
          <circle
            cx="34" cy="34" r="3.5"
            fill={active ? color : '#484f58'}
            style={{ transition: 'fill 0.3s' }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[12px] font-bold font-mono leading-none"
            style={{ color: active ? color : '#484f58', transition: 'color 0.3s' }}
          >
            {active ? `${Math.round(pct)}%` : '—'}
          </span>
        </div>
      </div>

      {/* App name */}
      <div className="text-center w-full px-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-text truncate">{label}</p>
        {sublabel != null && sublabel !== '—' && (
          <p className="text-[9px] text-muted/60 truncate mt-0.5">{sublabel}</p>
        )}
      </div>

      {/* Status pill */}
      <span
        className="text-[8px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wider"
        style={active
          ? { color, borderColor: color + '50', background: color + '16' }
          : { color: '#484f58', borderColor: '#30363d', background: 'transparent' }
        }
      >
        {active ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  )
}
