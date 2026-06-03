// CyberOS Dashboard — Activity Feed
// Right panel showing live ecosystem events, newest first

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { normalizeEvents, humanizeEventType, getAppAccentColor } from '../../utils/eventParser'
import { timeAgo } from '../../utils/timeAgo'

export default function ActivityFeed() {
  const events = useDashboardStore((s) => s.events)
  const feedFilter = useDashboardStore((s) => s.feedFilter)
  const setFeedFilter = useDashboardStore((s) => s.setFeedFilter)
  const settings = useDashboardStore((s) => s.settings)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const normalized = normalizeEvents(events)
  const filtered = feedFilter
    ? normalized.filter((e) => e.app.toLowerCase() === feedFilter.toLowerCase())
    : normalized
  const displayed = filtered.slice(0, settings.feedMaxItems)

  // Auto-scroll to top when new events arrive
  const prevCountRef = useRef(events.length)
  useEffect(() => {
    if (events.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    prevCountRef.current = events.length
  }, [events.length])

  // Unique app names for filter dropdown
  const appNames = [...new Set(normalized.map((e) => e.app))]

  // Warning if no events in 30 minutes
  const latestTimestamp = normalized[0]?.timestamp
  const isStale = latestTimestamp
    ? Date.now() - new Date(latestTimestamp).getTime() > 30 * 60_000
    : true

  return (
    <div className="w-[300px] bg-bg-elevated border-l border-border-subtle flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
            Activity Feed
          </p>
          {isStale && (
            <span className="w-2 h-2 rounded-full bg-warning" title="No events in 30+ minutes" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-interactive transition-colors"
            >
              {feedFilter ?? 'All'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline ml-1">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showFilterDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-default rounded-md shadow-lg z-50 py-1 min-w-[120px]"
              >
                <button
                  onClick={() => { setFeedFilter(null); setShowFilterDropdown(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-interactive"
                >
                  All Apps
                </button>
                {appNames.map((app) => (
                  <button
                    key={app}
                    onClick={() => { setFeedFilter(app); setShowFilterDropdown(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-interactive"
                  >
                    {app}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Mark all read */}
          <button
            className="text-[10px] text-text-muted hover:text-text-primary transition-colors"
            title="Mark all read"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {displayed.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-text-muted">No events yet</p>
            </div>
          ) : (
            displayed.map((event) => (
              <motion.div
                key={event.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="px-4 py-2.5 border-b border-border-subtle hover:bg-bg-interactive/30 transition-colors"
                style={{ borderLeftWidth: '2px', borderLeftColor: getAppAccentColor(event.app) }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: getAppAccentColor(event.app) }}
                  >
                    {event.app}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-text-primary">{humanizeEventType(event.event)}</p>
                {event.data && Object.keys(event.data).length > 0 && (
                  <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                    {Object.entries(event.data)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' • ')}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-border-subtle">
        <span className="text-[10px] text-text-muted">
          {displayed.length} of {normalized.length} events
        </span>
      </div>
    </div>
  )
}
