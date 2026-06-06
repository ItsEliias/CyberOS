// FeedFilterBar — All / High / Medium / Low / Starred / Unread
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import HelpTip from '../ui/HelpTip'
import type { ActiveFilter } from '../../../shared/types'

interface Tab { id: ActiveFilter; label: string }

const TABS: Tab[] = [
  { id: 'all',     label: 'All'     },
  { id: 'high',    label: 'High'    },
  { id: 'medium',  label: 'Medium'  },
  { id: 'low',     label: 'Low'     },
  { id: 'starred', label: 'Starred' },
  { id: 'unread',  label: 'Unread'  },
]

export default function FeedFilterBar() {
  const items        = useStore(s => s.items)
  const activeFilter = useStore(s => s.activeFilter)
  const setFilter    = useStore(s => s.setActiveFilter)

  const counts = useMemo(() => ({
    all:     items.length,
    high:    items.filter(i => i.relevanceTier === 'high' || i.relevanceTier === 'critical').length,
    medium:  items.filter(i => i.relevanceTier === 'medium').length,
    low:     items.filter(i => i.relevanceTier === 'low').length,
    starred: items.filter(i => i.saved).length,
    unread:  items.filter(i => !i.read).length,
  }), [items])

  const activeCount = counts[activeFilter]

  return (
    <div style={{ borderBottom: '1px solid rgba(42,51,71,0.5)' }}>
      <div className="flex items-center gap-0 px-2">
        {TABS.map(tab => {
          const count = counts[tab.id]
          const active = activeFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="relative px-2.5 py-2.5 text-[11px] whitespace-nowrap transition-colors duration-150"
              style={{ color: active ? '#e2e8f0' : '#8b949e' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#c9d1d9' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#8b949e' }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="ml-1 text-[9px] font-mono tabular-nums"
                  style={{ color: active ? '#ff6b6b' : 'rgba(139,148,158,0.4)' }}
                >
                  {count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t"
                  style={{ background: 'linear-gradient(90deg, #ff6b6b, #ff9b9b)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <HelpTip
            side="bottom-left"
            title="Filters & Search"
            text="Filter the current feed by relevance tier, starred state, or unread status. Press ⌘K from anywhere to open full-text search across every item."
          />
          <motion.span
            key={activeCount}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded"
            style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}
          >
            {activeCount} shown
          </motion.span>
        </div>
      </div>
    </div>
  )
}
