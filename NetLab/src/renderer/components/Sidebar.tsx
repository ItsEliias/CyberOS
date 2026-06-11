// NetLab — Sidebar.tsx (polish)

import type { ActiveView } from '../store'
import { useNetLabStore } from '../store'
import HelpTip from './ui/HelpTip'

/* 13×13 SVG icons for nav items */
const LabsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v3.5L1.5 9.5h10L9 5.5V2" />
    <line x1="3.5" y1="2" x2="9.5" y2="2" />
  </svg>
)
const ReferenceIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="1.5" width="9" height="10" rx="1" />
    <line x1="4.5" y1="4.5" x2="8.5" y2="4.5" />
    <line x1="4.5" y1="6.5" x2="8.5" y2="6.5" />
    <line x1="4.5" y1="8.5" x2="7" y2="8.5" />
  </svg>
)
const TopologyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="6.5" r="1.5" />
    <circle cx="2" cy="2" r="1" />
    <circle cx="11" cy="2" r="1" />
    <circle cx="2" cy="11" r="1" />
    <circle cx="11" cy="11" r="1" />
    <line x1="3" y1="2.5" x2="5" y2="5.5" />
    <line x1="10" y1="2.5" x2="8" y2="5.5" />
    <line x1="3" y1="10.5" x2="5" y2="7.5" />
    <line x1="10" y1="10.5" x2="8" y2="7.5" />
  </svg>
)
const SnippetsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="9" height="9" rx="1" />
    <polyline points="4,5 6,7 4,9" />
    <line x1="7" y1="9" x2="9" y2="9" />
  </svg>
)
const ProgressIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1.5,9.5 4.5,6 7,8 11.5,3" />
  </svg>
)
const SettingsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6.5" cy="6.5" r="1.5" />
    <path d="M6.5 1.5v1M6.5 10v1M1.5 6.5h1M10 6.5h1M3.2 3.2l.7.7M9.1 9.1l.7.7M3.2 9.8l.7-.7M9.1 3.9l.7-.7" />
  </svg>
)

interface NavItem {
  id: ActiveView
  label: string
  Icon: React.FC
}

const NAV: NavItem[] = [
  { id: 'labs',      label: 'Labs',      Icon: LabsIcon },
  { id: 'reference', label: 'Reference', Icon: ReferenceIcon },
  { id: 'topology',  label: 'Topology',  Icon: TopologyIcon },
  { id: 'snippets',  label: 'Snippets',  Icon: SnippetsIcon },
  { id: 'progress',  label: 'Progress',  Icon: ProgressIcon },
  { id: 'settings',  label: 'Settings',  Icon: SettingsIcon },
]

export default function Sidebar() {
  const activeView    = useNetLabStore(s => s.activeView)
  const setActiveView = useNetLabStore(s => s.setActiveView)

  return (
    <aside
      className="flex flex-col pt-2 pb-4 border-r border-border-subtle shrink-0"
      style={{ width: 204, background: 'var(--surface-0)' }}
    >
      {/* Section header */}
      <div className="px-4 mb-3 flex items-center gap-2 section-sep pb-2">
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Network Lab
        </span>
        <HelpTip
          title="Navigation"
          body="Jump between Labs, Reference, Topology, Snippets, Progress, and Settings. The Labs section is where you pick an exercise and step through it."
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV.map(({ id, label, Icon }) => {
          const active = id === activeView
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`nav-item flex items-center gap-2.5 px-3 rounded text-left w-full${active ? ' active' : ''}`}
              style={{
                height: 30,
                fontSize: 'var(--type-body)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <span style={{ opacity: active ? 1 : 0.55, flexShrink: 0 }}><Icon /></span>
              <span style={{ fontWeight: active ? 500 : 400 }}>{label}</span>
              {active && (
                <div className="ml-auto w-1 rounded-full"
                  style={{ height: 14, background: 'var(--accent)' }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Version */}
      <div className="px-4 mt-2">
        <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          v1.0.0
        </span>
      </div>
    </aside>
  )
}
