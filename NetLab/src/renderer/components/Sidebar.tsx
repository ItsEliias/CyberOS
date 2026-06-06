// NetLab — Sidebar.tsx

import type { ActiveView } from '../store'
import { useNetLabStore } from '../store'
import HelpTip from './ui/HelpTip'

interface NavItem {
  id: ActiveView
  label: string
  icon: string
}

const NAV: NavItem[] = [
  { id: 'labs',      label: 'Labs',      icon: '📋' },
  { id: 'reference', label: 'Reference', icon: '📖' },
  { id: 'topology',  label: 'Topology',  icon: '🗺' },
  { id: 'snippets',  label: 'Snippets',  icon: '💻' },
  { id: 'progress',  label: 'Progress',  icon: '📊' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
]

export default function Sidebar() {
  const activeView  = useNetLabStore(s => s.activeView)
  const setActiveView = useNetLabStore(s => s.setActiveView)

  return (
    <aside
      className="flex flex-col pt-2 pb-4 border-r border-border-subtle shrink-0"
      style={{ width: 220, background: '#0a0a0f' }}
    >
      {/* App subtitle */}
      <div className="px-4 mb-3 flex items-center gap-2">
        <span className="text-2xs text-text-muted uppercase tracking-widest">Network Lab</span>
        <HelpTip
          title="Navigation"
          body="Jump between Labs, Reference, Topology, Snippets, Progress, and Settings. The Labs section is where you pick an exercise and step through it."
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV.map(item => {
          const active = item.id === activeView
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left w-full"
              style={
                active
                  ? { background: 'rgba(94,196,255,0.1)', color: '#5ec4ff' }
                  : { color: '#8b949e' }
              }
            >
              <span className="text-base leading-none w-5 text-center">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {active && (
                <div
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ background: '#5ec4ff' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Version */}
      <div className="px-4 mt-2">
        <span className="text-2xs text-text-muted font-mono">v1.0.0</span>
      </div>
    </aside>
  )
}
