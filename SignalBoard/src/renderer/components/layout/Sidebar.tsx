// Sidebar — SignalBoard
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import AutoContextPanel from '../context/AutoContextPanel'
import CustomKeywords from '../context/CustomKeywords'
import type { ActiveView } from '../../../shared/types'

interface NavItem {
  id: ActiveView
  label: string
  icon: React.ReactNode
}

// 13×13px stroke SVGs, strokeWidth=1.5
const NAV: NavItem[] = [
  {
    id: 'feed',
    label: 'Signal Feed',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M2 11a8 8 0 0 1 8-8" />
        <path d="M2 7.5a4.5 4.5 0 0 1 4.5-4.5" />
        <path d="M2 4a1 1 0 0 1 1-1" />
        <circle cx="2" cy="11" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      >
        <rect x="1.5" y="2.5" width="10" height="9" rx="1" />
        <path d="M4 1.5v2M9 1.5v2M1.5 5.5h10" />
      </svg>
    ),
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M3 1.5h7a.5.5 0 0 1 .5.5v9l-4-2-4 2V2a.5.5 0 0 1 .5-.5z" />
      </svg>
    ),
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M1.5 10.5l3-3.5 2.5 2 3-4.5 2 2" />
      </svg>
    ),
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="4.5" cy="4.5" r="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M6 5.5l1.5 2" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
        stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="6.5" cy="6.5" r="1.5" />
        <path d="M6.5 1.5v1.2M6.5 10.3v1.2M11.5 6.5h-1.2M2.2 6.5H1M9.7 3.3l-.85.85M4.15 8.85 3.3 9.7M9.7 9.7l-.85-.85M4.15 4.15 3.3 3.3" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const activeView    = useStore(s => s.activeView)
  const setActiveView = useStore(s => s.setActiveView)
  const bookmarks     = useStore(s => s.bookmarks)
  const items         = useStore(s => s.items)
  const unread        = items.filter(i => !i.read).length

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sb-sidebar-collapsed') === '1' } catch { return false }
  })

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('sb-sidebar-collapsed', next ? '1' : '0') } catch {}
  }

  const categoryUnread: Record<string, number> = {
    feed:      unread,
    timeline:  items.filter(i => !i.read && i.relevanceTier !== 'low').length,
    bookmarks: bookmarks.length,
    trends:    items.filter(i => (i.alertMatches?.length ?? 0) > 0).length,
    sources:   0,
    settings:  0,
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: collapsed ? 44 : 184,
        transition: 'width 0.22s cubic-bezier(0.2,0.8,0.2,1)',
        background: 'var(--surface-0)',
        borderRight: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end px-1.5 pt-2 pb-1 flex-shrink-0">
        <button
          className="w-6 h-6 flex items-center justify-center rounded transition-colors"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="px-1.5 pb-2 section-sep">
        <div className="space-y-0.5">
          {NAV.map(item => {
            const isActive = activeView === item.id
            const cnt      = categoryUnread[item.id] ?? 0
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`nav-item w-full h-8 flex items-center rounded-sm font-medium relative${isActive ? ' active' : ''}`}
                style={{
                  padding: collapsed ? '0 14px' : '0 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 10,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  opacity: isActive ? 1 : undefined,
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sb-active-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{
                      width: 2,
                      height: 18,
                      background: 'var(--accent)',
                      boxShadow: '0 0 6px var(--accent-glow)',
                    }}
                    transition={{ type: 'tween', duration: 0.15 }}
                  />
                )}
                <span style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{ fontSize: 'var(--type-body)', }}
                    className="truncate">
                    {item.label}
                  </span>
                )}
                {!collapsed && cnt > 0 && (
                  <AnimatePresence>
                    <motion.span
                      key={cnt}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="ml-auto min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full tabular-nums leading-none"
                      style={{
                        fontSize: 'var(--type-caption)',
                        fontWeight: 700,
                        background: 'var(--accent-tint)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                      }}
                    >
                      {cnt > 99 ? '99+' : cnt}
                    </motion.span>
                  </AnimatePresence>
                )}
                {collapsed && cnt > 0 && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)', boxShadow: '0 0 4px var(--accent-glow)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Context + Keywords panels — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <AutoContextPanel />
          <CustomKeywords />
        </div>
      )}
    </aside>
  )
}
