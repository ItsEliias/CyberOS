// FeedView — main feed screen with filter bar, item list, reading pane, digest banner
import { useMemo, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store'
import FeedFilterBar from './FeedFilterBar'
import FeedItemCard from './FeedItem'
import ReadingPane from './ReadingPane'
import type { FeedItem } from '../../../shared/types'

function applyFilter(items: FeedItem[], filter: string): FeedItem[] {
  switch (filter) {
    case 'high':    return items.filter(i => i.relevanceTier === 'critical' || i.relevanceTier === 'high')
    case 'medium':  return items.filter(i => i.relevanceTier === 'medium')
    case 'low':     return items.filter(i => i.relevanceTier === 'low')
    case 'starred': return items.filter(i => i.saved)
    case 'unread':  return items.filter(i => !i.read)
    default:        return items
  }
}

export default function FeedView() {
  const items        = useStore(s => s.items)
  const activeFilter = useStore(s => s.activeFilter)
  const selectedId   = useStore(s => s.selectedId)
  const refreshing   = useStore(s => s.refreshing)
  const [digestItems, setDigestItems] = useState<FeedItem[]>([])
  const [showDigest, setShowDigest]   = useState(false)

  useEffect(() => {
    const unsub = window.electronAPI.onDigest(digest => {
      setDigestItems(digest)
      setShowDigest(true)
    })
    return unsub
  }, [])

  const filtered = useMemo(
    () => applyFilter(items, activeFilter).sort((a, b) => b.relevanceScore - a.relevanceScore || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    [items, activeFilter]
  )

  return (
    <div className="flex-1 flex min-w-0">
      {/* Feed column */}
      <div className="w-[340px] flex flex-col border-r border-white/[0.06] flex-shrink-0">
        <FeedFilterBar />

        <div className="flex-1 overflow-y-auto py-1">
          {/* Daily Digest Banner */}
          <AnimatePresence>
            {showDigest && digestItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-3 mb-2 mt-1 p-2.5 rounded-lg border"
                style={{ background: 'rgba(255,107,107,0.07)', borderColor: 'rgba(255,107,107,0.25)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Daily Digest — {digestItems.length} items</span>
                  <button onClick={() => setShowDigest(false)} className="text-muted/50 hover:text-muted text-xs">×</button>
                </div>
                <div className="space-y-1">
                  {digestItems.slice(0, 5).map(item => (
                    <FeedItemCard key={item.id} item={item} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              {refreshing ? (
                <p className="text-xs text-white/30">Loading feeds…</p>
              ) : (
                <>
                  <svg className="w-7 h-7 mb-3" style={{ color: 'rgba(255,107,107,0.25)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  <p className="text-sm font-medium text-white/50 mb-1">No signals found</p>
                  <p className="text-xs text-white/25 max-w-[180px] leading-relaxed">
                    Add a source in Sources to start receiving intel
                  </p>
                </>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((item, idx) => (
                <div key={item.id} style={{ transitionDelay: `${Math.min(idx * 40, 400)}ms` }}>
                  <FeedItemCard item={item} />
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Reading pane */}
      <ReadingPane />
    </div>
  )
}
