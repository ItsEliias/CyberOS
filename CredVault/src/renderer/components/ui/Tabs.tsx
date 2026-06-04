interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  accent?: string
  size?: 'sm' | 'md'
  className?: string
}

export default function Tabs({
  tabs, active, onChange, accent = 'var(--accent)', size = 'sm', className = '',
}: TabsProps) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  return (
    <div className={`flex items-center gap-0.5 bg-surface-2 border border-border-default/60 rounded-md p-0.5 ${className}`}>
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              ${pad} rounded font-medium transition-all duration-[150ms] flex items-center gap-1.5
              ${isActive ? 'text-text-primary bg-surface-1 shadow-elevation-1' : 'text-text-muted hover:text-text-secondary'}
            `}
            style={isActive ? { color: accent } : undefined}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="text-[10px] px-1 py-0 rounded tabular-nums"
                style={isActive
                  ? { background: `${accent}18`, color: accent }
                  : { background: 'rgba(42,51,71,0.4)', color: '#484f58' }
                }
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
