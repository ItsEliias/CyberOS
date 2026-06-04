type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'accent'

const VARIANTS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: { bg: 'rgba(42,51,71,0.25)',  text: '#8b949e', border: 'rgba(42,51,71,0.5)'  },
  success: { bg: 'rgba(63,185,80,0.12)', text: '#3fb950', border: 'rgba(63,185,80,0.3)' },
  warning: { bg: 'rgba(210,153,34,0.12)',text: '#d29922', border: 'rgba(210,153,34,0.3)'},
  danger:  { bg: 'rgba(248,81,73,0.12)', text: '#f85149', border: 'rgba(248,81,73,0.3)' },
  info:    { bg: 'rgba(74,158,255,0.12)',text: '#4a9eff', border: 'rgba(74,158,255,0.3)'},
  purple:  { bg: 'rgba(180,79,255,0.12)',text: '#b44fff', border: 'rgba(180,79,255,0.3)'},
  accent:  { bg: 'rgba(247,129,102,0.12)', text: 'var(--accent)', border: 'rgba(247,129,102,0.3)' },
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

export default function Badge({ children, variant = 'default', className = '', dot }: BadgeProps) {
  const v = VARIANTS[variant]
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${className}`}
      style={{ background: v.bg, color: v.text, borderColor: v.border }}
    >
      {dot && <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: v.text }} />}
      {children}
    </span>
  )
}
