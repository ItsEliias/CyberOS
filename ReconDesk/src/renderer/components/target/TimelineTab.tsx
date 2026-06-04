import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useRecondeskStore } from '../../stores/useRecondeskStore'
import type { TimelineEntryType } from '../../types/recondesk'

const TYPE_CONFIG: Record<TimelineEntryType, { color: string; label: string }> = {
  port_added:       { color: '#4a9eff', label: 'Port'       },
  credential_added: { color: '#f85149', label: 'Cred'       },
  card_created:     { color: '#d29922', label: 'Card'       },
  card_moved:       { color: '#3fb950', label: 'Moved'      },
  card_completed:   { color: '#3fb950', label: 'Done'       },
  status_changed:   { color: '#b44fff', label: 'Status'     },
  note_added:       { color: '#8b949e', label: 'Note'       },
  enrichment:       { color: '#4a9eff', label: 'Enrich'     },
  screenshot:       { color: '#d29922', label: 'Screenshot' },
  cve_alert:        { color: '#f85149', label: 'CVE'        },
  import:           { color: '#3fb950', label: 'Import'     },
}

const ALL_TYPES: TimelineEntryType[] = [
  'port_added', 'credential_added', 'card_created', 'card_moved', 'card_completed',
  'status_changed', 'note_added', 'enrichment', 'screenshot', 'cve_alert', 'import',
]

const FILTER_GROUPS: { label: string; types: TimelineEntryType[] }[] = [
  { label: 'Ports',       types: ['port_added'] },
  { label: 'Creds',       types: ['credential_added'] },
  { label: 'Cards',       types: ['card_created', 'card_moved', 'card_completed'] },
  { label: 'Status',      types: ['status_changed', 'note_added'] },
  { label: 'Enrichment',  types: ['enrichment', 'screenshot', 'import'] },
  { label: 'CVE Alerts',  types: ['cve_alert'] },
]

function formatTimestamp(iso: string): { date: string; time: string; relative: string } {
  try {
    const d   = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()

    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

    let relative = ''
    if (diff < 60_000)                       relative = 'just now'
    else if (diff < 3_600_000)               relative = `${Math.floor(diff / 60_000)}m ago`
    else if (diff < 86_400_000)              relative = `${Math.floor(diff / 3_600_000)}h ago`
    else if (diff < 7 * 86_400_000)          relative = `${Math.floor(diff / 86_400_000)}d ago`
    else                                     relative = date

    return { date, time, relative }
  } catch {
    return { date: iso, time: '', relative: '' }
  }
}

export default function TimelineTab({ targetId }: { targetId: string }) {
  const targets = useRecondeskStore(s => s.targets)
  const target  = targets.find(t => t.id === targetId)

  const [activeTypes, setActiveTypes] = useState<Set<TimelineEntryType>>(new Set(ALL_TYPES))
  const [showFilter, setShowFilter]   = useState(false)

  if (!target) return null

  const timeline = [...target.timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const filtered = timeline.filter(e => activeTypes.has(e.type))

  function toggleGroup(types: TimelineEntryType[]) {
    const allActive = types.every(t => activeTypes.has(t))
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (allActive) {
        types.forEach(t => next.delete(t))
      } else {
        types.forEach(t => next.add(t))
      }
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(42,51,71,0.5)', background: 'rgba(7,8,15,0.3)' }}>
        <span className="heading-sm" style={{ color: '#e6edf3' }}>
          Timeline
          <span className="text-[10px] font-normal ml-1.5" style={{ color: '#484f58' }}>
            ({filtered.length}{filtered.length !== timeline.length ? ` of ${timeline.length}` : ''})
          </span>
        </span>
        <div className="relative">
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`px-2.5 py-1.5 text-xs border rounded transition-colors ${
              showFilter
                ? 'bg-[#d29922]/10 border-[#d29922]/25 text-[#d29922]'
                : 'border-[#2a3347] text-[#8b949e] hover:text-[#d29922] hover:border-[#d29922]/30'
            }`}
          >
            Filter {activeTypes.size < ALL_TYPES.length && `(${activeTypes.size})`} ▾
          </button>

          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-8 z-20 bg-[#12131a] border border-[#2a3347] rounded-lg p-3 w-48 shadow-2xl"
              >
                <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-2">Show types</p>
                <div className="flex flex-col gap-1.5">
                  {FILTER_GROUPS.map(group => {
                    const allActive = group.types.every(t => activeTypes.has(t))
                    return (
                      <label key={group.label} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={allActive}
                          onChange={() => toggleGroup(group.types)}
                          className="accent-[#d29922]"
                        />
                        <span className="text-xs text-[#8b949e] group-hover:text-[#e2e8f0] transition-colors">
                          {group.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Timeline list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <motion.div
            className="flex items-center justify-center h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,148,158,0.07) 0%, transparent 70%)' }} />
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: '#8b949e', opacity: 0.4 }}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 3l1.5 1.5M19 3l-1.5 1.5M5 21l1.5-1.5M19 21l-1.5-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#8b949e' }}>No timeline entries</p>
              <p className="text-xs mt-1" style={{ color: '#484f58' }}>Activity is logged automatically as you work</p>
            </div>
          </motion.div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[#2a3347]" />

            <div className="flex flex-col gap-0">
              <AnimatePresence initial>
                {filtered.map((entry, i) => {
                  const cfg = TYPE_CONFIG[entry.type] ?? { color: '#4a5568', label: '?' }
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.18 }}
                      className="flex items-start gap-3 py-2.5 pl-5 relative group"
                    >
                      {/* Dot */}
                      <span
                        className="absolute left-[1px] top-[14px] w-2 h-2 rounded-full border-2 flex-shrink-0"
                        style={{ backgroundColor: cfg.color, borderColor: '#07080f', boxShadow: `0 0 6px ${cfg.color}50` }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider flex-shrink-0"
                            style={{
                              color:           cfg.color,
                              backgroundColor: `${cfg.color}15`,
                              border:          `1px solid ${cfg.color}28`,
                            }}
                          >
                            {cfg.label}
                          </span>
                          {/* Relative time + full datetime on hover */}
                          <span
                            className="text-[10px] font-mono flex-shrink-0 tabular-nums"
                            style={{ color: '#484f58' }}
                            title={`${formatTimestamp(entry.timestamp).date} ${formatTimestamp(entry.timestamp).time}`}
                          >
                            {formatTimestamp(entry.timestamp).relative}
                            <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[9px]" style={{ color: '#484f58' }}>
                              {formatTimestamp(entry.timestamp).time}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#e2e8f0' }}>{entry.description}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
