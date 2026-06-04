// TimelineView — all items chronological, grouped by day, source-color dots
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import type { FeedItem } from '../../../shared/types'

const TIER_COLOR: Record<string, string> = {
  critical: '#ff6b6b',
  high:     '#f85149',
  medium:   '#d29922',
  low:      '#4a5568',
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function getDayKey(iso: string): string {
  return new Date(iso).toDateString()
}

interface DayGroup {
  key: string
  label: string
  items: FeedItem[]
}

// ── TrendChart (14-day SVG area chart) ────────────────────────────────────────

function TrendMiniChart({ sourceId, items }: { sourceId: string; items: FeedItem[] }) {
  const data = useMemo(() => {
    const counts: number[] = new Array(14).fill(0)
    const alertCounts: number[] = new Array(14).fill(0)
    const now = Date.now()
    items
      .filter(i => i.sourceId === sourceId)
      .forEach(i => {
        const daysAgo = Math.floor((now - new Date(i.publishedAt).getTime()) / 86400_000)
        if (daysAgo >= 0 && daysAgo < 14) {
          counts[13 - daysAgo]++
          if (i.alertMatches?.length) alertCounts[13 - daysAgo]++
        }
      })
    return { counts, alertCounts }
  }, [sourceId, items])

  const max = Math.max(...data.counts, 1)
  const w = 120, h = 28, pad = 2

  const points = data.counts.map((v, i) => {
    const x = pad + (i / 13) * (w - pad * 2)
    const y = h - pad - ((v / max) * (h - pad * 2))
    return `${x},${y}`
  }).join(' ')

  const fillPoints = [
    `${pad},${h - pad}`,
    ...data.counts.map((v, i) => {
      const x = pad + (i / 13) * (w - pad * 2)
      const y = h - pad - ((v / max) * (h - pad * 2))
      return `${x},${y}`
    }),
    `${w - pad},${h - pad}`,
  ].join(' ')

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polygon points={fillPoints} fill="rgba(255,107,107,0.08)" />
      <polyline points={points} fill="none" stroke="rgba(255,107,107,0.5)" strokeWidth="1.2" />
      {data.alertCounts.map((v, i) => v > 0 ? (
        <circle
          key={i}
          cx={pad + (i / 13) * (w - pad * 2)}
          cy={h - pad - ((data.counts[i] / max) * (h - pad * 2))}
          r="2.5"
          fill="#ff6b6b"
        />
      ) : null)}
    </svg>
  )
}

// ── TimelineItem ──────────────────────────────────────────────────────────────

function TimelineItem({ item, sourceColor }: { item: FeedItem; sourceColor: string }) {
  const setSelectedId = useStore(s => s.setSelectedId)
  const setActiveView = useStore(s => s.setActiveView)
  const patchItem     = useStore(s => s.patchItem)

  const tierColor = item.alertMatches?.length ? '#ff6b6b' : (TIER_COLOR[item.relevanceTier] ?? '#4a5568')

  async function handleClick() {
    setActiveView('feed')
    setSelectedId(item.id)
    if (!item.read) {
      await window.electronAPI.markRead(item.id)
      patchItem(item.id, { read: true })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 group cursor-pointer py-1.5 hover:bg-white/[0.02] px-2 rounded transition-colors"
      onClick={handleClick}
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 mt-1">
        <div className="w-2 h-2 rounded-full border-2 flex-shrink-0" style={{ borderColor: sourceColor, background: item.read ? 'transparent' : sourceColor }} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-muted/50">{formatTime(item.publishedAt)}</span>
          <span className="text-[9px] px-1 py-px rounded font-bold uppercase" style={{ color: tierColor, background: `${tierColor}15`, border: `1px solid ${tierColor}30` }}>
            {item.relevanceTier}
          </span>
          {item.alertMatches?.map(m => (
            <span key={m.ruleId} className="text-[9px] px-1 py-px rounded font-bold uppercase" style={{ color: m.color, background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
              {m.label}
            </span>
          ))}
          <span className="ml-auto text-[9px] text-muted/40 flex-shrink-0 truncate max-w-[100px]">{item.sourceName}</span>
        </div>
        <p className={`text-xs leading-snug ${item.read ? 'text-muted/60' : 'text-text/90 font-medium'}`}>
          {item.title}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TimelineView() {
  const items   = useStore(s => s.items)
  const sources = useStore(s => s.sources)

  const sourceColorMap = useMemo(() => {
    const m = new Map<string, string>()
    sources.forEach(s => m.set(s.id, s.color))
    return m
  }, [sources])

  const dayGroups = useMemo((): DayGroup[] => {
    const sorted = [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    const map = new Map<string, FeedItem[]>()
    sorted.forEach(item => {
      const key = getDayKey(item.publishedAt)
      const arr = map.get(key) ?? []
      arr.push(item)
      map.set(key, arr)
    })
    return [...map.entries()].map(([key, groupItems]) => ({
      key,
      label: formatDay(groupItems[0].publishedAt),
      items: groupItems,
    }))
  }, [items])

  // Unique sources in view for mini charts
  const activeSources = useMemo(() => {
    const seen = new Set<string>()
    items.forEach(i => seen.add(i.sourceId))
    return sources.filter(s => seen.has(s.id)).slice(0, 6)
  }, [items, sources])

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {/* Timeline column */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold text-text mb-1">Timeline</h2>
          <p className="text-xs text-muted/50 mb-5">All items in chronological order. Grouped by day.</p>

          {dayGroups.length === 0 && (
            <p className="text-xs text-muted/40">No items yet — refresh to load feeds.</p>
          )}

          {dayGroups.map(group => (
            <div key={group.key} className="mb-6">
              {/* Day header */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted/60">{group.label}</span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[10px] text-muted/40 font-mono">{group.items.length}</span>
              </div>

              {/* Items for this day */}
              <div className="border-l border-border/30 pl-3 ml-1 space-y-0.5">
                {group.items.map(item => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    sourceColor={sourceColorMap.get(item.sourceId) ?? '#4a5568'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: trend charts */}
      {activeSources.length > 0 && (
        <div className="w-[200px] border-l border-border/30 flex-shrink-0 overflow-y-auto p-4">
          <p className="text-[10px] font-semibold text-muted/50 uppercase tracking-widest mb-4">14-Day Activity</p>
          <div className="space-y-4">
            {activeSources.map(src => (
              <div key={src.id}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: src.color }} />
                  <span className="text-[10px] text-muted/70 truncate">{src.name}</span>
                </div>
                <TrendMiniChart sourceId={src.id} items={items} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
