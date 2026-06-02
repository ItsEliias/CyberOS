import { useMemo } from 'react'
import { useStore } from '../store'

const HOURS = 24
const W = 400
const H = 56
const PAD_X = 4
const PAD_Y = 6

function buildBuckets(events: { timestamp: string }[]): number[] {
  const now     = Date.now()
  const buckets = Array(HOURS).fill(0)
  for (const e of events) {
    const age = now - new Date(e.timestamp).getTime()
    const idx = Math.floor(age / 3_600_000)
    if (idx >= 0 && idx < HOURS) buckets[HOURS - 1 - idx]++
  }
  return buckets
}

function buildPaths(buckets: number[], max: number): { line: string; area: string } {
  const bucketW = (W - PAD_X * 2) / buckets.length
  const points  = buckets.map((v, i) => ({
    x: PAD_X + i * bucketW + bucketW / 2,
    y: H - PAD_Y - (max > 0 ? (v / max) * (H - PAD_Y * 2) : 0),
  }))

  if (points.length === 0) return { line: '', area: '' }

  const pts = points.map(p => `${p.x},${p.y}`).join(' L ')
  const line = `M ${pts}`
  const area = `M ${points[0].x},${H} L ${pts} L ${points[points.length - 1].x},${H} Z`

  return { line, area }
}

export default function EcosystemChart() {
  const eventHistory = useStore(s => s.eventHistory)

  const { buckets, max } = useMemo(() => {
    const b = buildBuckets(eventHistory)
    return { buckets: b, max: Math.max(...b, 1) }
  }, [eventHistory])

  const { line, area } = useMemo(() => buildPaths(buckets, max), [buckets, max])

  const totalEvents = buckets.reduce((a, b) => a + b, 0)

  return (
    <div className="bg-panel border border-border rounded-lg p-4 flex-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">
          Ecosystem Activity
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-accent">{totalEvents} events</span>
          <span className="text-[10px] text-muted/50">24h</span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4a9eff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4a9eff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.33, 0.66, 1].map(pct => (
          <line
            key={pct}
            x1={PAD_X} x2={W - PAD_X}
            y1={H - PAD_Y - pct * (H - PAD_Y * 2)}
            y2={H - PAD_Y - pct * (H - PAD_Y * 2)}
            stroke="#30363d" strokeWidth="0.5" strokeDasharray="4 5"
          />
        ))}

        {/* Area fill */}
        {area && <path d={area} fill="url(#chartGrad)" />}

        {/* Line */}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="#4a9eff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Baseline */}
        <line
          x1={PAD_X} x2={W - PAD_X}
          y1={H - PAD_Y} y2={H - PAD_Y}
          stroke="#30363d" strokeWidth="0.8"
        />
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-1">
        <span className="text-[9px] text-muted/40 font-mono">24h ago</span>
        <span className="text-[9px] text-muted/40 font-mono">12h ago</span>
        <span className="text-[9px] text-muted/40 font-mono">now</span>
      </div>
    </div>
  )
}
