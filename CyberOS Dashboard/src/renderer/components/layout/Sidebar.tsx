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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Operator Profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem Status',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
    <div className="w-[200px] flex flex-col shrink-0 border-r border-border-subtle/50" style={{ background: 'rgba(18, 19, 26, 0.8)' }}>
      {/* Navigation items */}
      <nav className="px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full h-9 flex items-center gap-3 px-3 rounded-md text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'text-text-primary bg-bg-interactive'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-interactive/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full shadow-[0_0_8px_rgba(74,158,255,0.2)]"
                    transition={{ type: 'tween', duration: 0.15 }}
                  />
                )}
                <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-border-subtle" />

        {/* Settings */}
        <button
          onClick={() => setActiveView('settings')}
          className={`w-full h-9 flex items-center gap-3 px-3 rounded-md text-sm font-medium transition-colors ${
            activeView === 'settings'
              ? 'text-text-primary bg-bg-interactive'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-interactive/50'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>

      {/* Active session context strip — only visible when shared_context.activeLab is set */}
      {ecosystemContext.activeLab && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mx-3"
        >
          <div className="px-3 py-2.5 bg-accent/10 rounded-md border-l-[3px] border-l-[#b44fff]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Active Session</span>
            </div>
            <p className="text-xs text-text-primary font-semibold truncate">
              Lab: {ecosystemContext.activeLab}
            </p>
            {ecosystemContext.activeIP && (
              <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                Target: {ecosystemContext.activeIP}
              </p>
            )}
          </div>
        </motion.div>
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
              } as React.CSSProperties}
              title={`${card.name}: ${card.active ? 'Online' : 'Offline'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
