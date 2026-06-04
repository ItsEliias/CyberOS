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
  {
    id: 'apps',
    label: 'App Details',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="6" height="6" rx="1" />
        <rect x="9" y="3" width="6" height="6" rx="1" />
        <rect x="16" y="3" width="6" height="6" rx="1" />
        <rect x="2" y="11" width="6" height="6" rx="1" />
        <rect x="9" y="11" width="6" height="6" rx="1" />
        <rect x="16" y="11" width="6" height="6" rx="1" />
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
                className={`w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm font-medium relative overflow-hidden`}
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(74,158,255,0.1)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(74,158,255,0.2)' : 'transparent'}`,
                  transition: 'background 180ms, color 180ms, border-color 180ms, box-shadow 180ms',
                  boxShadow: isActive ? '0 0 12px rgba(74,158,255,0.1)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: 'var(--accent)', boxShadow: '0 0 10px rgba(74,158,255,0.5)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                  />
                )}
                <span style={{ color: isActive ? 'var(--accent)' : 'inherit', transition: 'color 180ms' }}>{item.icon}</span>
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
              className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm font-medium relative overflow-hidden"
              style={{
                color: isDS ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isDS ? 'rgba(74,158,255,0.1)' : 'transparent',
                border: `1px solid ${isDS ? 'rgba(74,158,255,0.2)' : 'transparent'}`,
                transition: 'background 180ms, color 180ms, border-color 180ms',
              }}
              onMouseEnter={(e) => { if (!isDS) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={(e) => { if (!isDS) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              {isDS && (
                <motion.div layoutId="sidebar-pill" className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: 'var(--accent)', boxShadow: '0 0 10px rgba(74,158,255,0.5)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
                />
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: isDS ? 'var(--accent)' : 'inherit', transition: 'color 180ms' }}>
                <circle cx="12" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="12" cy="19" r="2" />
              </svg>
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
              className="w-full h-9 flex items-center gap-3 px-3 rounded-lg text-sm font-medium relative"
              style={{
                color: isSett ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isSett ? 'rgba(74,158,255,0.1)' : 'transparent',
                border: `1px solid ${isSett ? 'rgba(74,158,255,0.2)' : 'transparent'}`,
                transition: 'background 180ms, color 180ms, border-color 180ms',
              }}
              onMouseEnter={(e) => { if (!isSett) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={(e) => { if (!isSett) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: isSett ? 'var(--accent)' : 'inherit', transition: 'color 180ms' }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
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
