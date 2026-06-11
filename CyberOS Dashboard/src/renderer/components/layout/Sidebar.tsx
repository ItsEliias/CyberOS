// CyberOS Dashboard — Sidebar Navigation
// Fix #4: Active session context strip + mini ecosystem summary at bottom

import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import type { ViewId } from '../../types/ecosystem'

interface NavItem {
  id: ViewId
  label: string
  icon: JSX.Element
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="1.5" width="4" height="4" rx="0.5" />
        <rect x="7.5" y="1.5" width="4" height="4" rx="0.5" />
        <rect x="7.5" y="7.5" width="4" height="4" rx="0.5" />
        <rect x="1.5" y="7.5" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Operator Profile',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 11v-1a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v1" />
        <circle cx="6.5" cy="4" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem Status',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12,6.5 9.5,6.5 8,11 5,2 3.5,6.5 1,6.5" />
      </svg>
    ),
  },
  {
    id: 'apps',
    label: 'App Details',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="1.5" width="3.5" height="3.5" rx="0.5" />
        <rect x="5.25" y="1.5" width="3.5" height="3.5" rx="0.5" />
        <rect x="9" y="1.5" width="2.5" height="3.5" rx="0.5" />
        <rect x="1.5" y="5.25" width="3.5" height="3.5" rx="0.5" />
        <rect x="5.25" y="5.25" width="3.5" height="3.5" rx="0.5" />
        <rect x="9" y="5.25" width="2.5" height="3.5" rx="0.5" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const activeView = useDashboardStore((s) => s.activeView)
  const setActiveView = useDashboardStore((s) => s.setActiveView)
  const ecosystemContext = useDashboardStore((s) => s.ecosystemContext)
  const config = useDashboardStore((s) => s.config)

  // Build app cards for mini ecosystem summary
  const cards = buildAppCards(config)
  const activeCount = cards.filter((c) => c.active).length

  return (
    <div className="flex flex-col shrink-0 border-r border-border-subtle/50" style={{ width: 184, background: 'var(--surface-0)' }}>
      {/* Navigation items */}
      <nav className="px-2 pt-3 pb-2">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`nav-item w-full flex items-center gap-2.5 px-3 rounded text-left${isActive ? ' active' : ''}`}
                style={{
                  height: 30,
                  fontSize: 'var(--type-body)',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{ width: 2, height: 14, background: 'var(--accent)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                  />
                )}
                <span style={{ opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-border-subtle" />

        {/* Design System (Phase A sign-off) */}
        {(() => {
          const isDS = activeView === 'design-system'
          return (
            <button
              onClick={() => setActiveView('design-system')}
              className={`nav-item w-full flex items-center gap-2.5 px-3 rounded text-left${isDS ? ' active' : ''}`}
              style={{
                height: 30, fontSize: 'var(--type-body)',
                fontWeight: isDS ? 500 : 400,
                color: isDS ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {isDS && (
                <motion.div layoutId="sidebar-pill" className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{ width: 2, height: 14, background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                />
              )}
              <span style={{ opacity: isDS ? 1 : 0.55 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="12" cy="19" r="2" />
                </svg>
              </span>
              <span>Design System</span>
            </button>
          )
        })()}

        {/* Settings */}
        {(() => {
          const isSett = activeView === 'settings'
          return (
            <button
              onClick={() => setActiveView('settings')}
              className={`nav-item w-full flex items-center gap-2.5 px-3 rounded text-left${isSett ? ' active' : ''}`}
              style={{
                height: 30, fontSize: 'var(--type-body)',
                fontWeight: isSett ? 500 : 400,
                color: isSett ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <span style={{ opacity: isSett ? 1 : 0.55 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6.5" cy="6.5" r="1.5" />
                  <path d="M6.5 1.5v1M6.5 10v1M1.5 6.5h1M10 6.5h1M3.2 3.2l.7.7M9.1 9.1l.7.7M3.2 9.8l.7-.7M9.1 3.9l.7-.7" />
                </svg>
              </span>
              <span>Settings</span>
            </button>
          )
        })()}
      </nav>

      {/* Active session context strip — slim panel above status bar */}
      {ecosystemContext.activeLab && (
        <div
          className="font-mono text-xs"
          style={{
            background: 'rgba(74, 158, 255, 0.05)',
            borderTop: '1px solid rgba(42, 51, 71, 0.6)',
            padding: '8px 12px',
          }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-text-muted w-[50px] shrink-0 text-[10px] uppercase">Target</span>
              <span className="text-text-primary truncate">{ecosystemContext.activeTarget ?? ecosystemContext.activeLab}</span>
            </div>
            {ecosystemContext.activeIP && (
              <div className="flex items-center gap-2">
                <span className="text-text-muted w-[50px] shrink-0 text-[10px] uppercase">IP</span>
                <span className="text-text-primary">{ecosystemContext.activeIP}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-text-muted w-[50px] shrink-0 text-[10px] uppercase">Lab</span>
              <span className="text-text-primary truncate">Active Session</span>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mini ecosystem summary — bottom of sidebar */}
      <div className="px-3 py-3 border-t border-border-subtle/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Ecosystem</span>
          <span className="text-[10px] font-mono text-text-secondary">
            <span className="text-success">{activeCount}</span>/{cards.length}
          </span>
        </div>
        {/* Colored dot row */}
        <div className="flex items-center gap-1 flex-wrap">
          {cards.map((card) => (
            <span
              key={card.id}
              className={`w-2 h-2 rounded-full ${card.active ? 'status-dot-pulse' : ''}`}
              style={{
                backgroundColor: card.accentColor,
                opacity: card.active ? 1 : 0.3,
                '--pulse-color': `${card.accentColor}66`,
                '--pulse-color-fade': `${card.accentColor}00`,
              } as React.CSSProperties}
              title={`${card.name}: ${card.active ? 'Online' : 'Offline'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
