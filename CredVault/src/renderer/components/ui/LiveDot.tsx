type LiveDotStatus = 'online' | 'offline' | 'pending' | 'blocked'

const STATUS: Record<LiveDotStatus, { color: string; rgb: string; pulse: boolean }> = {
  online:  { color: '#3fb950', rgb: '63,185,80',  pulse: true  },
  offline: { color: '#484f58', rgb: '72,79,88',   pulse: false },
  pending: { color: '#d29922', rgb: '210,153,34', pulse: true  },
  blocked: { color: '#f85149', rgb: '248,81,73',  pulse: false },
}

interface LiveDotProps {
  status?: LiveDotStatus
  size?: number
  className?: string
}

export default function LiveDot({ status = 'offline', size = 7, className = '' }: LiveDotProps) {
  const s = STATUS[status]
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${s.pulse ? 'status-dot-pulse' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: s.color,
        '--pulse-color': `rgba(${s.rgb},0.4)`,
        '--pulse-color-fade': `rgba(${s.rgb},0)`,
      } as React.CSSProperties}
    />
  )
}
