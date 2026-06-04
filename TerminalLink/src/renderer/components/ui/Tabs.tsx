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
  tabs,
  active,
  onChange,
  accent = 'var(--accent)',
  size = 'sm',
  className = '',
}: TabsProps) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  return (
    <div
      className={`flex items-center gap-0.5 rounded-md p-0.5 ${className}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid rgba(0,255,65,0.12)',
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`${pad} rounded-sm font-medium font-mono transition-all flex items-center gap-1.5 cursor-pointer`}
            style={isActive
              ? { color: accent, background: 'var(--surface-1)', boxShadow: 'var(--elevation-1)' }
              : { color: 'var(--text-muted)' }
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="text-2xs px-1 py-0 rounded-xs tabular-nums font-mono"
                style={isActive
                  ? { background: `${accent}18`, color: accent }
                  : { background: 'rgba(0,255,65,0.06)', color: 'var(--text-muted)' }
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
