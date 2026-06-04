type LiveDotStatus = 'online' | 'offline' | 'pending' | 'blocked'

const STATUS: Record<LiveDotStatus, { color: string; pulse: boolean }> = {
  online:  { color: '#00ff41', pulse: true  },
  offline: { color: '#3d6b3d', pulse: false },
  pending: { color: '#d29922', pulse: true  },
  blocked: { color: '#f85149', pulse: false },
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
      style={{ width: size, height: size, backgroundColor: s.color } as React.CSSProperties}
    />
  )
}
