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

export default function Tabs({ tabs, active, onChange, accent = 'var(--accent)', size = 'sm', className = '' }: TabsProps) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  return (
    <div
      className={`flex items-center gap-0.5 rounded-[10px] p-0.5 border ${className}`}
      style={{ background: '#131525', borderColor: 'rgba(42,51,71,0.6)' }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`${pad} rounded-[6px] font-medium transition-all duration-[150ms] flex items-center gap-1.5`}
            style={{
              color: isActive ? accent : 'var(--text-muted)',
              background: isActive ? '#0d0e18' : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.5)' : 'none',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="text-[0.6875rem] px-1 py-0 rounded-[4px] tabular-nums"
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
