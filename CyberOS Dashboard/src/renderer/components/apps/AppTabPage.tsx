// CyberOS Dashboard — App Tab Page
// Per-app stats page: header, metric tiles, activity sparkline, launch button

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { timeAgo } from '../../utils/timeAgo'
import type { MetricSnapshot } from '../../types/ecosystem'

export interface AppTabDef {
  key: string
  name: string
  subtitle: string
  accentColor: string
  getMetrics: (cfg: any) => AppMetric[]
  getConnectionStatus: (cfg: any) => boolean
}

export interface AppMetric {
  label: string
  value: string | number
}

interface AppTabPageProps {
  def: AppTabDef
}

export default function AppTabPage({ def }: AppTabPageProps) {
  const config = useDashboardStore((s) => s.config)
  const liveStats = useDashboardStore((s) => s.liveStats)

  const metrics = def.getMetrics(config)
  const connected = def.getConnectionStatus(config)
  const history = liveStats[def.key]?.history ?? []

  const handleLaunch = () => {
    const reg = (config as any)[def.key]
    if (reg?.execPath) {
      window.electronAPI.launchApp(reg.execPath)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="glass-card px-5 py-4 flex items-center gap-4"
        style={{ borderLeft: `4px solid ${def.accentColor}` }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text-primary">{def.name}</h2>
            <ConnectionBadge connected={connected} accentColor={def.accentColor} />
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{def.subtitle}</p>
        </div>
        <button
          onClick={handleLaunch}
          className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={{
            background: `${def.accentColor}22`,
            color: def.accentColor,
            border: `1px solid ${def.accentColor}44`,
          }}
        >
          Launch App
        </button>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <MetricTile key={m.label} metric={m} accentColor={def.accentColor} />
        ))}
      </div>

      {/* Activity graph */}
      <ActivityGraph
        history={history}
        accentColor={def.accentColor}
        appKey={def.key}
      />
    </div>
  )
}

// ─── Connection Badge ─────────────────────────────────────────────────────────

function ConnectionBadge({ connected, accentColor }: { connected: boolean; accentColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${connected ? 'status-dot-pulse' : 'opacity-30'}`}
        style={{
          backgroundColor: connected ? accentColor : '#4a5568',
          '--pulse-color': `${accentColor}66`,
          '--pulse-color-fade': `${accentColor}00`,
        } as React.CSSProperties}
      />
      <span className={`text-xs ${connected ? 'text-text-secondary' : 'text-text-muted'}`}>
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}

// ─── Metric Tile ──────────────────────────────────────────────────────────────

function MetricTile({ metric, accentColor }: { metric: AppMetric; accentColor: string }) {
  const isNumeric = typeof metric.value === 'number'

  return (
    <div className="glass-card px-4 py-3">
      <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">
        {metric.label}
      </span>
      <span
        className={`font-bold tabular-nums ${isNumeric ? 'text-2xl' : 'text-sm'}`}
        style={
          isNumeric
            ? { color: accentColor, textShadow: `0 0 10px ${accentColor}44` }
            : { color: '#e2e8f0' }
        }
      >
        {metric.value === null || metric.value === undefined ? '—' : String(metric.value)}
      </span>
    </div>
  )
}

// ─── Activity Graph ───────────────────────────────────────────────────────────

interface ActivityGraphProps {
  history: MetricSnapshot[]
  accentColor: string
  appKey: string
}

function ActivityGraph({ history, accentColor, appKey }: ActivityGraphProps) {
  const points = useMemo(() => {
    if (history.length < 2) {
      // Placeholder flat line when no real data yet
      return Array.from({ length: 7 }, (_, i) => ({ timestamp: Date.now() - i * 60_000, value: 0 }))
    }
    return history.slice(-20)
  }, [history])

  const hasRealData = history.length >= 2

  const svgData = useMemo(() => {
    const width = 400
    const height = 60
    const vals = points.map((p) => p.value)
    const max = Math.max(...vals, 1)
    const min = Math.min(...vals)
    const range = max - min || 1
    const step = width / Math.max(points.length - 1, 1)

    const coords = points.map((p, i) => ({
      x: i * step,
      y: height - ((p.value - min) / range) * (height - 8) - 4,
    }))

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`

    return { linePath, areaPath, width, height }
  }, [points])

  const lastTimestamp = history[history.length - 1]?.timestamp

  return (
    <div className="glass-card px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Activity — Last {points.length} Snapshots
        </p>
        {lastTimestamp && (
          <span className="text-[10px] text-text-muted font-mono">
            Updated {timeAgo(new Date(lastTimestamp).toISOString())}
          </span>
        )}
        {!hasRealData && (
          <span className="text-[10px] text-text-muted italic">Awaiting live data…</span>
        )}
      </div>

      <svg
        width={svgData.width}
        height={svgData.height}
        viewBox={`0 0 ${svgData.width} ${svgData.height}`}
        className="w-full"
        style={{ height: '60px' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`area-grad-${appKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={hasRealData ? '0.25' : '0.08'} />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={svgData.areaPath} fill={`url(#area-grad-${appKey})`} />
        <path
          d={svgData.linePath}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={hasRealData ? '1' : '0.3'}
          style={{ filter: hasRealData ? `drop-shadow(0 0 4px ${accentColor}88)` : 'none' }}
        />
      </svg>
    </div>
  )
}
