// TrendsView — keyword frequency, source activity, score distribution, tag cloud
import { useMemo, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import type { FeedItem } from '../../../shared/types'

// ── helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','is','was',
  'are','were','be','been','have','has','had','do','does','did','will','would','could',
  'should','may','might','this','that','these','those','it','its','by','as','from',
  'into','not','no','new','via','after','before','over','under','about','up','out','can',
])

function extractWords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
}

function topN<T>(map: Map<T, number>, n: number): [T, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

function within7Days(items: FeedItem[]): FeedItem[] {
  const cutoff = Date.now() - 7 * 86400_000
  return items.filter(i => new Date(i.publishedAt).getTime() > cutoff)
}

// ── components ──────────────────────────────────────────────────────────────

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const timer = setTimeout(() => {
      el.style.width = `${pct}%`
    }, delay)
    return () => clearTimeout(timer)
  }, [pct, delay])

  return (
    <div ref={ref} className="h-full rounded" style={{ width: '0%', background: color, transition: 'width 0.65s cubic-bezier(0.2,0.8,0.2,1)' }} />
  )
}

// SVG mini bar chart for keyword frequency
function SvgBarChart({ data, max, color }: { data: [string, number][]; max: number; color: string }) {
  const BAR_H = 28
  const GAP = 4
  const LABEL_W = 96
  const COUNT_W = 24
  const TOTAL_H = data.length * (BAR_H + GAP)
  const svgW = 320 // bar area width

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${LABEL_W + svgW + COUNT_W + 16} ${TOTAL_H}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {data.map(([word, count], idx) => {
        const y = idx * (BAR_H + GAP)
        const barW = Math.max(2, (count / max) * svgW)
        return (
          <g key={word}>
            {/* Label */}
            <text
              x={LABEL_W - 6}
              y={y + BAR_H / 2 + 4}
              textAnchor="end"
              fontSize="10"
              fill="rgba(139,148,158,0.75)"
              fontFamily="ui-monospace, monospace"
            >
              {word.length > 14 ? word.slice(0, 13) + '…' : word}
            </text>
            {/* Bar bg */}
            <rect x={LABEL_W} y={y + 4} width={svgW} height={BAR_H - 8} rx="4" fill="rgba(42,51,71,0.35)" />
            {/* Bar fill */}
            <rect
              x={LABEL_W}
              y={y + 4}
              width={barW}
              height={BAR_H - 8}
              rx="4"
              fill={color}
              style={{ transition: 'width 0.65s cubic-bezier(0.2,0.8,0.2,1)' }}
            />
            {/* Count */}
            <text
              x={LABEL_W + svgW + 8}
              y={y + BAR_H / 2 + 4}
              fontSize="10"
              fill="rgba(139,148,158,0.55)"
              fontFamily="ui-monospace, monospace"
            >
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function KeywordFrequency({ items }: { items: FeedItem[] }) {
  const freqMap = useMemo(() => {
    const m = new Map<string, number>()
    within7Days(items).forEach(item => {
      extractWords(`${item.title} ${item.summary}`).forEach(w => {
        m.set(w, (m.get(w) ?? 0) + 1)
      })
    })
    return m
  }, [items])

  const top10 = topN(freqMap, 10)
  const max   = top10[0]?.[1] ?? 1

  return (
    <div className="p-5 border border-border/40 rounded bg-panel/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text">Keyword Frequency — Last 7 Days</h3>
        <span className="text-[9px] font-mono text-muted/40">{top10.length} terms</span>
      </div>
      {top10.length === 0 ? (
        <p className="text-xs text-muted/40">Not enough data yet.</p>
      ) : (
        <SvgBarChart data={top10} max={max} color="url(#kw-grad)" />
      )}
      {/* Gradient def */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="kw-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#ff9b9b" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

function SourceActivity({ items }: { items: FeedItem[] }) {
  const data = useMemo(() => {
    const srcMap = new Map<string, number>()
    within7Days(items).forEach(i => {
      srcMap.set(i.sourceName, (srcMap.get(i.sourceName) ?? 0) + 1)
    })
    return topN(srcMap, 8)
  }, [items])

  const max = data[0]?.[1] ?? 1

  return (
    <div className="p-5 border border-border/40 rounded bg-panel/20">
      <h3 className="text-xs font-semibold text-text mb-4">Source Activity — Last 7 Days</h3>
      {data.length === 0 ? (
        <p className="text-xs text-muted/40">No activity data.</p>
      ) : (
        <div className="space-y-2">
          {data.map(([name, count], idx) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-[11px] text-muted/70 w-32 truncate">{name}</span>
              <div className="flex-1 h-3 bg-border/30 rounded overflow-hidden">
                <AnimatedBar pct={(count / max) * 100} color="linear-gradient(90deg, rgba(74,158,255,0.5), rgba(74,158,255,0.8))" delay={idx * 60} />
              </div>
              <span className="text-[10px] font-mono text-muted/60 w-6 text-right tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoreDistribution({ items }: { items: FeedItem[] }) {
  const counts = useMemo(() => ({
    critical: items.filter(i => i.relevanceTier === 'critical').length,
    high:     items.filter(i => i.relevanceTier === 'high').length,
    medium:   items.filter(i => i.relevanceTier === 'medium').length,
    low:      items.filter(i => i.relevanceTier === 'low').length,
  }), [items])

  const total = items.length || 1
  const slices = [
    { label: 'Critical', count: counts.critical, color: '#ff6b6b' },
    { label: 'High',     count: counts.high,     color: '#f85149' },
    { label: 'Medium',   count: counts.medium,   color: '#d29922' },
    { label: 'Low',      count: counts.low,      color: '#4a5568' },
  ]

  // Build conic gradient
  let cumulative = 0
  const segments = slices.map(s => {
    const pct = (s.count / total) * 100
    const start = cumulative
    cumulative += pct
    return { ...s, pct, start }
  })
  const conicStr = segments
    .map(s => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`)
    .join(', ')

  return (
    <div className="p-5 border border-border/40 rounded bg-panel/20">
      <h3 className="text-xs font-semibold text-text mb-4">Relevance Score Distribution</h3>
      <div className="flex items-center gap-8">
        <div
          className="w-24 h-24 rounded-full flex-shrink-0"
          style={{ background: total === 1 ? '#1e2030' : `conic-gradient(${conicStr})` }}
        />
        <div className="space-y-2">
          {slices.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[11px] text-muted/70 w-14">{s.label}</span>
              <span className="text-[11px] font-mono text-text">{s.count}</span>
              <span className="text-[10px] text-muted/40">({((s.count / total) * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TagCloud({ items }: { items: FeedItem[] }) {
  const tags = useMemo(() => {
    const highItems = items.filter(i => i.relevanceTier === 'critical' || i.relevanceTier === 'high')
    const m = new Map<string, number>()
    highItems.forEach(item => {
      item.tags.forEach(t => m.set(t, (m.get(t) ?? 0) + 1))
      extractWords(item.title).slice(0, 5).forEach(w => m.set(w, (m.get(w) ?? 0) + 1))
    })
    return topN(m, 20)
  }, [items])

  if (tags.length === 0) {
    return (
      <div className="p-5 border border-border/40 rounded bg-panel/20">
        <h3 className="text-xs font-semibold text-text mb-4">Top Keywords This Week</h3>
        <p className="text-xs text-muted/40">No high-relevance items this week.</p>
      </div>
    )
  }

  const maxCount = tags[0]?.[1] ?? 1

  return (
    <div className="p-5 border border-border/40 rounded bg-panel/20">
      <h3 className="text-xs font-semibold text-text mb-4">Top Keywords This Week <span className="text-muted/40 font-normal">(from high-relevance items)</span></h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(([word, count]) => {
          const size = 9 + Math.round((count / maxCount) * 6)
          const opacity = 0.5 + (count / maxCount) * 0.5
          return (
            <span
              key={word}
              className="px-2 py-0.5 rounded border border-accent/20 bg-accent/5"
              style={{ fontSize: size, color: `rgba(255,107,107,${opacity})` }}
            >
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Feed Health Dashboard ─────────────────────────────────────────────────────

function FeedHealth({ items }: { items: FeedItem[] }) {
  const sources = useStore(s => s.sources)

  const rows = sources.map(src => {
    const attempts   = src.attemptCount ?? (src.successCount ?? 0) + (src.errorCount ?? 0)
    const rate       = attempts > 0 ? Math.round(((src.successCount ?? 0) / attempts) * 100) : null
    const alertCount = items.filter(i => i.sourceId === src.id && (i.alertMatches?.length ?? 0) > 0).length
    const color      = !src.enabled ? '#4a5568'
      : (src.consecutiveFailures ?? 0) >= 3 ? '#f85149'
      : rate === null ? '#4a9eff'
      : rate >= 80 ? '#3fb950'
      : rate >= 50 ? '#d29922'
      : '#f85149'
    return { src, rate, alertCount, color }
  })

  return (
    <div className="col-span-2 p-5 border border-border/40 rounded bg-panel/20">
      <h3 className="text-xs font-semibold text-text mb-4">Feed Health</h3>
      <div className="space-y-2">
        {rows.map(({ src, rate, alertCount, color }) => (
          <div key={src.id} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[11px] text-muted/80 w-36 truncate flex-shrink-0">{src.name}</span>
            <div className="flex-1 h-2 bg-border/30 rounded overflow-hidden">
              <AnimatedBar pct={rate ?? 0} color={color} delay={0} />
            </div>
            <span className="text-[10px] font-mono text-muted/60 w-10 text-right flex-shrink-0">
              {rate !== null ? `${rate}%` : '—'}
            </span>
            <span className="text-[10px] font-mono text-muted/60 w-10 text-right flex-shrink-0">
              {src.itemCount}
            </span>
            {alertCount > 0 && (
              <span className="text-[9px] px-1.5 py-px rounded font-bold" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.25)' }}>
                {alertCount} alert{alertCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function TrendsView() {
  const items = useStore(s => s.items)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-sm font-semibold text-text mb-1">Trends</h2>
      <p className="text-xs text-muted/50 mb-6">Intelligence patterns across your feed.</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><KeywordFrequency items={items} /></div>
        <SourceActivity items={items} />
        <ScoreDistribution items={items} />
        <FeedHealth items={items} />
        <div className="col-span-2"><TagCloud items={items} /></div>
      </div>
    </div>
  )
}
