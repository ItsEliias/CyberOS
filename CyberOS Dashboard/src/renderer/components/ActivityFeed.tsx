import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { EcosystemEvent } from '../../shared/types'

const APP_COLORS: Record<string, string> = {
  GhostVault: '#7bb8ff',
  VaultCore:  '#3fb950',
  CyberLab:   '#b44fff',
  ReconDesk:  '#d29922',
  CyberOS:    '#4a9eff',
  Launcher:   '#8b949e',
}

const EVENT_LABELS: Record<string, string> = {
  'app:launched':        'launched',
  'app:closed':          'closed',
  'dashboard:launched':  'dashboard opened',
  'dashboard:closed':    'dashboard closed',
  'note:created':        'note created',
  'note:saved':          'note saved',
  'scrape:started':      'scrape started',
  'scrape:completed':    'scrape completed',
  'session:started':     'session started',
  'session:saved':       'session saved',
  'target:added':        'target added',
  'target:removed':      'target removed',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 5_000)    return 'now'
  if (diff < 60_000)   return `${Math.floor(diff / 1_000)}s`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  return `${Math.floor(diff / 3600_000)}h`
}

function EventRow({ event }: { event: EcosystemEvent & { appName?: string; eventType?: string } }) {
  // Support both schemas: {app, event} (dashboard) and {appName, eventType} (other apps)
  const appName  = event.app      || event.appName  || 'Unknown'
  const eventKey = event.event    || event.eventType || ''
  const color = APP_COLORS[appName] || '#8b949e'
  const label = EVENT_LABELS[eventKey] || (eventKey ? eventKey.replace(/[:.]/g, ' ') : '—')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-2.5 py-2 px-3 rounded hover:bg-border/20 transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium" style={{ color }}>{appName}</span>
          <span className="text-[11px] text-muted truncate">{label}</span>
        </div>
        {event.data && Object.keys(event.data).length > 0 && (
          <p className="text-[10px] text-muted/60 truncate mt-0.5">
            {Object.entries(event.data).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
          </p>
        )}
      </div>
      <span className="text-[10px] text-muted/50 flex-shrink-0 mt-0.5">{timeAgo(event.timestamp)}</span>
    </motion.div>
  )
}

export default function ActivityFeed() {
  const events  = useStore(s => s.events)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [events.length])

  return (
    <div className="w-64 flex flex-col border-l border-border flex-shrink-0">
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">Activity</span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {events.length === 0 ? (
          <p className="text-[11px] text-muted/60 text-center mt-8 px-4 leading-relaxed">
            No ecosystem events yet.<br />Launch an app to see activity.
          </p>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {events.map(e => <EventRow key={e.id} event={e} />)}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
