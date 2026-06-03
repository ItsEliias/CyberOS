// CyberOS Dashboard — Event Log (Full View)
// Searchable, filterable full event log

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { normalizeEvents, humanizeEventType, getAppAccentColor, filterEvents } from '../../utils/eventParser'
import { formatTimestamp, formatDate } from '../../utils/timeAgo'

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
    <div className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
            Event Log
          </p>
          <span className="text-[10px] text-text-muted bg-bg-interactive px-1.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="px-4 py-2 border-b border-border-subtle flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="flex-1 bg-bg-interactive border border-border-default rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
        />
        <select
          value={appFilter ?? ''}
          onChange={(e) => setAppFilter(e.target.value || null)}
          className="bg-bg-interactive border border-border-default rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
        >
          <option value="">All Apps</option>
          {appNames.map((app) => (
            <option key={app} value={app}>{app}</option>
          ))}
        </select>
      </div>

      {/* Event list */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-text-muted">No events match your filters</p>
          </div>
        ) : (
          filtered.map((event) => (
            <div key={event.id}>
              <div
                className="px-4 py-2 border-b border-border-subtle/50 hover:bg-bg-interactive/30 cursor-pointer flex items-center gap-3"
                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
              >
                <span className="text-[10px] text-text-muted font-mono w-[60px] shrink-0">
                  {formatTimestamp(event.timestamp)}
                </span>
                <span
                  className="text-xs font-medium w-[90px] shrink-0"
                  style={{ color: getAppAccentColor(event.app) }}
                >
                  {event.app}
                </span>
                <span className="text-xs text-text-primary flex-1">
                  {humanizeEventType(event.event)}
                </span>
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-text-muted transition-transform ${expandedId === event.id ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <AnimatePresence>
                {expandedId === event.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-2 bg-bg-interactive/20">
                      <pre className="text-[10px] text-text-secondary font-mono whitespace-pre-wrap">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                      <p className="text-[10px] text-text-muted mt-1">{formatDate(event.timestamp)}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
