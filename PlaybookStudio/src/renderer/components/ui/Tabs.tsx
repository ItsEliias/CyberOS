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
      className={`flex items-center gap-0.5 rounded-md p-0.5 border ${className}`}
      style={{ background: '#131525', borderColor: 'rgba(42,51,71,0.6)' }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`${pad} rounded font-medium transition-all flex items-center gap-1.5`}
            style={
              isActive
                ? { color: accent, background: '#0d0e18' }
                : { color: '#484f58', background: 'transparent' }
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="text-xs px-1 py-0 rounded tabular-nums"
                style={isActive
                  ? { background: `rgba(45,212,191,0.12)`, color: accent }
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
