// FeedView — main feed screen with filter bar, item list, reading pane, digest banner
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../../store'
import FeedFilterBar from './FeedFilterBar'
import FeedItemCard from './FeedItem'
import ReadingPane from './ReadingPane'
import type { FeedItem } from '../../../shared/types'

// Inject refresh glow animation once
const REFRESH_GLOW_STYLE = `
@keyframes refresh-glow-spin {
  0%   { transform: rotate(0deg);   filter: drop-shadow(0 0 4px rgba(255,107,107,0.0)); }
  25%  { filter: drop-shadow(0 0 6px rgba(255,107,107,0.7)); }
  100% { transform: rotate(360deg); filter: drop-shadow(0 0 4px rgba(255,107,107,0.0)); }
}
.refresh-glow-spin {
  animation: refresh-glow-spin 0.9s cubic-bezier(0.5,0,0.5,1) infinite;
  transform-origin: center;
}
`

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
  const patchItem    = useStore(s => s.patchItem)
  const activeFilter = useStore(s => s.activeFilter)
  const selectedId   = useStore(s => s.selectedId)
  const refreshing   = useStore(s => s.refreshing)
  const [digestItems, setDigestItems] = useState<FeedItem[]>([])
  const [showDigest, setShowDigest]   = useState(false)
  const [newCount, setNewCount]       = useState(0)
  const [markAllFlash, setMarkAllFlash] = useState(false)
  const prevItemCount = useRef(items.length)
  const feedListRef   = useRef<HTMLDivElement>(null)

  // Inject refresh glow keyframes once
  useEffect(() => {
    const id = 'signalboard-refresh-glow'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = REFRESH_GLOW_STYLE
      document.head.appendChild(s)
    }
  }, [])

  // Track new items arriving
  useEffect(() => {
    if (items.length > prevItemCount.current && prevItemCount.current > 0) {
      setNewCount(c => c + (items.length - prevItemCount.current))
    }
    prevItemCount.current = items.length
  }, [items.length])

  const scrollToTopAndClear = useCallback(() => {
    setNewCount(0)
    feedListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

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

  function handleMarkAllRead() {
    const unread = filtered.filter(i => !i.read)
    if (unread.length === 0) return
    setMarkAllFlash(true)
    unread.forEach((item, idx) => {
      setTimeout(() => {
        window.electronAPI.markRead(item.id).catch(() => {})
        patchItem(item.id, { read: true })
      }, idx * 40)
    })
    setTimeout(() => setMarkAllFlash(false), unread.length * 40 + 600)
  }

  return (
    <div className="flex-1 flex min-w-0">
      {/* Feed column */}
      <div className="w-[340px] flex flex-col border-r border-white/[0.06] flex-shrink-0">
        {/* Column header with refresh indicator */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1" style={{ minHeight: '28px' }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a5568' }}>Feed</span>
          <div className="flex items-center gap-2">
            {filtered.filter(i => !i.read).length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                style={{
                  background: markAllFlash ? 'rgba(63,185,80,0.12)' : 'transparent',
                  border: `1px solid ${markAllFlash ? 'rgba(63,185,80,0.3)' : 'rgba(42,51,71,0.5)'}`,
                  color: markAllFlash ? '#3fb950' : '#6b7a90',
                  transition: 'all 0.2s',
                }}
                title="Mark all visible items as read"
              >
                {markAllFlash ? (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                )}
                {markAllFlash ? 'Done' : 'Mark all read'}
              </button>
            )}
            {refreshing && (
              <svg
                className="refresh-glow-spin w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#ff6b6b"
                strokeWidth={2.2}
                style={{ color: '#ff6b6b' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>
        </div>
        <FeedFilterBar />

        {/* New items banner */}
        <AnimatePresence>
          {newCount > 0 && (
            <motion.button
              className="new-items-banner w-full text-[11px] font-semibold py-2 px-3 flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
              style={{
                background: 'rgba(74,158,255,0.12)',
                borderBottom: '1px solid rgba(74,158,255,0.25)',
                color: '#4a9eff',
              }}
              onClick={scrollToTopAndClear}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {newCount} new item{newCount !== 1 ? 's' : ''} — click to view
            </motion.button>
          )}
        </AnimatePresence>

        <div ref={feedListRef} className="flex-1 overflow-y-auto py-1">
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
                <div className="w-full px-3 space-y-2 pt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className="rounded-lg p-3 mx-0" style={{ background: 'rgba(22,27,39,0.5)', border: '1px solid rgba(42,51,71,0.4)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="skeleton h-3 w-14 rounded" />
                        <div className="skeleton h-3 w-10 rounded" />
                        <div className="ml-auto skeleton h-3 w-8 rounded" />
                      </div>
                      <div className="skeleton h-3.5 w-full rounded mb-1.5" style={{ animationDelay: `${n * 0.08}s` }} />
                      <div className="skeleton h-3.5 w-4/5 rounded" style={{ animationDelay: `${n * 0.1}s` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="float-up">
                  {/* Illustrated empty state */}
                  <div className="relative mx-auto mb-4 w-16 h-16">
                    <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" style={{ color: 'rgba(255,107,107,0.12)' }}>
                      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1" />
                      <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1" />
                      <circle cx="32" cy="32" r="2" fill="rgba(255,107,107,0.3)" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-5 h-5" style={{ color: 'rgba(255,107,107,0.4)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-semibold mb-1.5" style={{ color: '#8b949e' }}>No signals found</p>
                  <p className="text-xs leading-relaxed max-w-[170px]" style={{ color: '#4a5568' }}>
                    Add a source in Sources to start receiving intelligence
                  </p>
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((item, idx) => (
                <FeedItemCard key={item.id} item={item} index={idx} />
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
