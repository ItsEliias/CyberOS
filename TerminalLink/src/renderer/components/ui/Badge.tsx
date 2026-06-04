type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'accent'

const VARIANTS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: { bg: 'rgba(0,255,65,0.06)',   text: '#7abf7a', border: 'rgba(0,255,65,0.15)'  },
  success: { bg: 'rgba(0,255,65,0.12)',   text: '#00ff41', border: 'rgba(0,255,65,0.3)'  },
  warning: { bg: 'rgba(210,153,34,0.12)', text: '#d29922', border: 'rgba(210,153,34,0.3)' },
  danger:  { bg: 'rgba(248,81,73,0.12)',  text: '#f85149', border: 'rgba(248,81,73,0.3)'  },
  info:    { bg: 'rgba(74,158,255,0.12)', text: '#4a9eff', border: 'rgba(74,158,255,0.3)' },
  purple:  { bg: 'rgba(180,79,255,0.12)', text: '#b44fff', border: 'rgba(180,79,255,0.3)' },
  accent:  { bg: 'rgba(var(--accent-rgb),0.12)', text: 'var(--accent)', border: 'rgba(var(--accent-rgb),0.3)' },
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
  dot,
}: BadgeProps) {
  const v = VARIANTS[variant]
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-2xs font-medium border font-mono ${className}`}
      style={{ background: v.bg, color: v.text, borderColor: v.border }}
    >
      {dot && (
        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: v.text }} />
      )}
      {children}
    </span>
  )
}
