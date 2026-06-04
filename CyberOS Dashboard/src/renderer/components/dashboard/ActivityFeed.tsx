// CyberOS Dashboard — Activity Feed
// Right panel — live ecosystem events, deduped, newest first

import { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { normalizeEvents, humanizeEventType, getAppAccentColor } from '../../utils/eventParser'
import { timeAgo } from '../../utils/timeAgo'

interface DeduplicatedEvent {
  id: string
  app: string
  event: string
  timestamp: string
  data: Record<string, unknown>
  count: number
}

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

  const deduplicated = useMemo(() => {
    const result: DeduplicatedEvent[] = []
    const maxItems = settings.feedMaxItems ?? 50
    const topItems = filtered.slice(0, maxItems)
    for (const event of topItems) {
      const key = `${event.app}::${event.event}`
      const existing = result.find((r) => `${r.app}::${r.event}` === key)
      if (existing) {
        existing.count += 1
      } else {
        result.push({ id: event.id, app: event.app, event: event.event, timestamp: event.timestamp, data: event.data, count: 1 })
      }
    }
    return result.slice(0, 20)
  }, [filtered, settings.feedMaxItems])

  const prevCountRef = useRef(events.length)
  useEffect(() => {
    if (events.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    prevCountRef.current = events.length
  }, [events.length])

  const appNames = [...new Set(normalized.map((e) => e.app))]
  const latestTimestamp = normalized[0]?.timestamp
  const isStale = latestTimestamp
    ? Date.now() - new Date(latestTimestamp).getTime() > 30 * 60_000
    : true

  return (
    <div
      className="w-[272px] flex flex-col shrink-0"
      style={{
        background: 'rgba(11,12,19,0.7)',
        borderLeft: '1px solid rgba(42,51,71,0.3)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.3)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Activity
          </span>
          {isStale && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--sev-medium)' }}
              title="No events in 30+ minutes"
            />
          )}
          {deduplicated.length > 0 && !isStale && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(74,158,255,0.1)', color: 'var(--accent)' }}
            >
              {deduplicated.length}
            </span>
          )}
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-0.5 text-[10px] text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded transition-colors font-mono"
            style={{ background: showFilterDropdown ? 'rgba(42,51,71,0.4)' : 'transparent' }}
          >
            {feedFilter ?? 'ALL'}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-0.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showFilterDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50 py-1 min-w-[130px] rounded-lg overflow-hidden"
              style={{
                background: 'rgba(13,14,24,0.96)',
                border: '1px solid rgba(42,51,71,0.7)',
                boxShadow: 'var(--elevation-3)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <button
                onClick={() => { setFeedFilter(null); setShowFilterDropdown(false) }}
                className="w-full text-left px-3 py-1.5 text-[10px] text-text-primary hover:bg-bg-interactive transition-colors"
              >
                All Apps
              </button>
              {appNames.map((app) => (
                <button
                  key={app}
                  onClick={() => { setFeedFilter(app); setShowFilterDropdown(false) }}
                  className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-bg-interactive transition-colors"
                  style={{ color: getAppAccentColor(app) }}
                >
                  {app}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Events */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {deduplicated.length === 0 ? (
            <div className="px-4 py-12 text-center fade-in">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: 'rgba(74,158,255,0.07)',
                  border: '1px solid rgba(74,158,255,0.14)',
                  boxShadow: '0 0 20px rgba(74,158,255,0.06)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(74,158,255,0.5)' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-[11px] font-medium text-text-secondary mb-1">No activity yet</p>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Events will appear here as<br />your apps send updates.
              </p>
            </div>
          ) : (
            deduplicated.map((event, i) => {
              const accentColor = getAppAccentColor(event.app)
              return (
                <motion.div
                  key={event.id}
                  initial={{ x: 16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -12, opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderBottom: '1px solid rgba(42,51,71,0.2)',
                    borderLeft: `2px solid ${accentColor}55`,
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold" style={{ color: accentColor }}>
                        {event.app}
                      </span>
                      {event.count > 1 && (
                        <span
                          className="text-[9px] font-mono px-1 rounded"
                          style={{ background: 'rgba(42,51,71,0.5)', color: 'var(--text-muted)' }}
                        >
                          ×{event.count}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-text-muted font-mono tabular-nums">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-primary leading-snug">
                    {humanizeEventType(event.event)}
                  </p>
                  {event.data && Object.keys(event.data).length > 0 && (
                    <p className="text-[9px] text-text-muted mt-0.5 truncate font-mono">
                      {Object.entries(event.data)
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                  )}
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderTop: '1px solid rgba(42,51,71,0.3)' }}
      >
        <span className="text-[9px] text-text-muted font-mono">
          {deduplicated.length} unique · {normalized.length} total
        </span>
      </div>
    </div>
  )
}
