// CyberOS Dashboard — Event Log (searchable, filterable)

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { normalizeEvents, humanizeEventType, getAppAccentColor, filterEvents } from '../../utils/eventParser'
import { formatTimestamp, formatDate, timeAgo } from '../../utils/timeAgo'

export default function EventLog() {
  const events = useDashboardStore((s) => s.events)
  const [search, setSearch] = useState('')
  const [appFilter, setAppFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const normalized = normalizeEvents(events)
  const appNames = [...new Set(normalized.map((e) => e.app))]

  const filtered = useMemo(
    () => filterEvents(normalized, { app: appFilter, search }),
    [normalized, appFilter, search]
  )

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Event Log
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(74,158,255,0.1)', color: 'var(--accent)' }}
          >
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Search + filter */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.25)' }}
      >
        <div className="flex-1 relative">
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full text-[11px] pl-7 pr-3 py-1.5 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none transition-colors"
            style={{
              background: 'rgba(42,51,71,0.3)',
              border: '1px solid rgba(42,51,71,0.5)',
            }}
          />
        </div>
        <select
          value={appFilter ?? ''}
          onChange={(e) => setAppFilter(e.target.value || null)}
          className="text-[11px] px-2 py-1.5 rounded-lg text-text-primary focus:outline-none transition-colors"
          style={{
            background: 'rgba(42,51,71,0.3)',
            border: '1px solid rgba(42,51,71,0.5)',
          }}
        >
          <option value="">All Apps</option>
          {appNames.map((app) => (
            <option key={app} value={app}>{app}</option>
          ))}
        </select>
      </div>

      {/* Event list */}
      <div className="max-h-[360px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="empty-state content-stream-in">
            <div className="empty-glyph">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="7" height="7" rx="1" />
                <rect x="11" y="2" width="7" height="7" rx="1" />
                <rect x="11" y="11" width="7" height="7" rx="1" />
                <rect x="2" y="11" width="7" height="7" rx="1" />
              </svg>
            </div>
            <p className="empty-title">No events</p>
            <p className="empty-sub">No events match your current filters.</p>
          </div>
        ) : (
          filtered.map((event, rowIdx) => {
            const accentColor = getAppAccentColor(event.app)
            const isExpanded = expandedId === event.id
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16, delay: Math.min(rowIdx, 12) * 0.05, ease: 'easeOut' }}
              >
                <div
                  className="px-4 py-2 flex items-center gap-3 cursor-pointer transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: '1px solid rgba(42,51,71,0.2)' }}
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  <span
                    className="text-[10px] text-text-muted font-mono w-[52px] shrink-0 tabular-nums cursor-default"
                    title={formatTimestamp(event.timestamp)}
                  >
                    {timeAgo(event.timestamp)}
                  </span>
                  <span
                    className="text-[10px] font-semibold w-[80px] shrink-0 truncate"
                    style={{ color: accentColor }}
                  >
                    {event.app}
                  </span>
                  <span className="text-[11px] text-text-primary flex-1 truncate">
                    {humanizeEventType(event.event)}
                  </span>
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-text-muted transition-transform shrink-0"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 py-2.5 mx-2 my-1 rounded-lg"
                        style={{ background: 'rgba(42,51,71,0.2)', border: '1px solid rgba(42,51,71,0.3)' }}
                      >
                        <pre className="text-[10px] text-text-secondary font-mono whitespace-pre-wrap">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                        <p className="text-[10px] text-text-muted mt-1.5 font-mono">{formatDate(event.timestamp)}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
