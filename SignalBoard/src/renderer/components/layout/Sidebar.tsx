// Sidebar — SignalBoard
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import AutoContextPanel from '../context/AutoContextPanel'
import CustomKeywords from '../context/CustomKeywords'
import type { ActiveView } from '../../../shared/types'

interface NavItem {
  id: ActiveView
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  {
    id: 'feed',
    label: 'Signal Feed',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

  return (
    <aside
      className="w-[200px] flex flex-col flex-shrink-0"
      style={{
        background: 'rgba(10,11,18,0.92)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Nav */}
      <nav className="px-2 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="space-y-0.5">
          {NAV.map(item => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="w-full h-9 flex items-center gap-3 px-3 rounded-sm text-[13px] font-medium transition-all duration-fast relative"
                style={{
                  color: isActive ? '#e6edf3' : '#484f58',
                  background: isActive ? 'rgba(255,107,107,0.07)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#8b949e'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#484f58'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sb-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: '#ff6b6b', boxShadow: '0 0 8px rgba(255,107,107,0.5)' }}
                    transition={{ type: 'tween', duration: 0.15 }}
                  />
                )}
                <span style={{ color: isActive ? '#ff6b6b' : 'inherit' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'feed' && unread > 0 && (
                  <span
                    className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums leading-none"
                    style={{ background: 'rgba(255,107,107,0.18)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)' }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
                {item.id === 'bookmarks' && bookmarks.length > 0 && (
                  <span
                    className="ml-auto text-[9px] font-mono tabular-nums"
                    style={{ color: 'rgba(255,107,107,0.6)' }}
                  >
                    {bookmarks.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Context + Keywords panels */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <AutoContextPanel />
        <CustomKeywords />
      </div>
    </aside>
  )
}
