import { motion } from 'framer-motion'
import { useStore } from '../store'
import type { TimelineEvent } from '../../shared/types'

const TYPE_COLOR: Record<TimelineEvent['type'], string> = {
  card:   'bg-accent',
  asset:  'bg-success',
  status: 'bg-text-dim',
}

const TYPE_LABEL_COLOR: Record<TimelineEvent['type'], string> = {
  card:   'text-accent',
  asset:  'text-success',
  status: 'text-muted',
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function TimelineView() {
  const activeId = useStore(s => s.activeTargetId)
  const targets  = useStore(s => s.targets)
  const active   = targets.find(t => t.id === activeId)

  if (!activeId || !active) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted">Select a target to view its timeline</p>
      </div>
    )
  }

  const events = [...(active.timeline ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Context bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-text">{active.name}</span>
        <span className="text-xs font-mono text-accent/70">{active.ip}</span>
        <span className="ml-auto text-[11px] text-muted">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <p className="text-[11px] text-muted/60 text-center mt-12">No events yet.</p>
        ) : (
          <div className="relative max-w-xl">
            {/* Vertical line */}
            <div className="absolute left-[84px] top-0 bottom-0 w-px bg-border" />

            <div className="flex flex-col gap-0">
              {events.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.15 }}
                  className="flex items-start gap-4 py-2.5"
                >
                  {/* Timestamp */}
                  <span className="w-20 flex-shrink-0 text-[10px] text-muted text-right leading-tight pt-0.5">
                    {formatTime(ev.timestamp)}
                  </span>

                  {/* Dot */}
                  <div className="flex-shrink-0 mt-1.5 relative z-10">
                    <span className={`block w-2 h-2 rounded-full ${TYPE_COLOR[ev.type]}`} />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className={`text-[9px] uppercase tracking-widest font-semibold ${TYPE_LABEL_COLOR[ev.type]}`}>
                      {ev.type}
                    </span>
                    <span className="text-xs text-text leading-relaxed">{ev.description}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
