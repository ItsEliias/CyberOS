// FeedFilterBar — All / High / Medium / Low / Starred / Unread
import { useMemo } from 'react'
import { useStore } from '../../store'
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

  return (
    <div
      className="flex items-center gap-0 px-2"
      style={{ borderBottom: '1px solid rgba(42,51,71,0.5)' }}
    >
      {TABS.map(tab => {
        const count = counts[tab.id]
        const active = activeFilter === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className="relative px-2.5 py-2.5 text-[11px] transition-colors whitespace-nowrap"
            style={{ color: active ? '#e2e8f0' : '#8b949e' }}
          >
            {tab.label}
            {count > 0 && (
              <span
                className="ml-1 text-[9px] font-mono"
                style={{ color: active ? '#ff6b6b' : 'rgba(139,148,158,0.5)' }}
              >
                {count}
              </span>
            )}
            {active && (
              <span
                className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t"
                style={{ background: '#ff6b6b' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
