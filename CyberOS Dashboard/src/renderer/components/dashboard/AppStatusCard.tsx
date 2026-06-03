// CyberOS Dashboard — App Status Card
// Instrument panel style card with accent left border, SVG area chart, glowing metrics

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AppCardData } from '../../types/ecosystem'
import { timeAgo } from '../../utils/timeAgo'

interface AppStatusCardProps {
  card: AppCardData
  index: number
}

export default function AppStatusCard({ card, index }: AppStatusCardProps) {
  const [hovered, setHovered] = useState(false)

  const handleLaunch = () => {
    if (card.execPath) {
      window.electronAPI.launchApp(card.execPath)
    }
  }

  // Generate pseudo-random sparkline data based on app id
  const sparklinePoints = useMemo(() => {
    const seed = card.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const points: number[] = []
    for (let i = 0; i < 12; i++) {
      points.push(30 + Math.sin(seed + i * 0.8) * 20 + Math.cos(seed * 0.3 + i) * 10)
    }
    return points
  }, [card.id])

  // Build SVG path for area chart
  const svgPath = useMemo(() => {
    const width = 120
    const height = 32
    const step = width / (sparklinePoints.length - 1)
    const max = Math.max(...sparklinePoints)
    const min = Math.min(...sparklinePoints)
    const range = max - min || 1

    const linePoints = sparklinePoints.map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })

    const linePath = `M${linePoints.join(' L')}`
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`

    return { linePath, areaPath, width, height }
  }, [sparklinePoints])

  const primaryMetric = card.metrics[0]
  const secondaryMetrics = card.metrics.slice(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass-card accent-border-left p-4 relative overflow-hidden transition-colors hover:bg-bg-interactive/40 cursor-default"
      style={{ '--accent-color': card.accentColor } as React.CSSProperties}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status dot with pulse */}
          <span
            className={`w-2 h-2 rounded-full ${card.active ? 'status-dot-pulse' : 'opacity-30'}`}
            style={{
              backgroundColor: card.accentColor,
              '--pulse-color': `${card.accentColor}66`,
            } as React.CSSProperties}
          />
          <span className="text-xs font-semibold text-text-primary">{card.name}</span>
        </div>
        <span className={`text-[10px] font-mono ${card.active ? 'text-success' : 'text-text-muted'}`}>
          {card.active ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      {/* Primary metric — large and glowing */}
      {primaryMetric && (
        <div className="mb-2">
          <span
            className="text-lg font-bold tabular-nums metric-glow"
            style={{
              color: card.accentColor,
              '--glow-color': `${card.accentColor}80`,
              textShadow: `0 0 8px ${card.accentColor}66`,
            } as React.CSSProperties}
          >
            {primaryMetric.value}
          </span>
          <span className="text-[10px] text-text-muted ml-2">{primaryMetric.label}</span>
        </div>
      )}

      {/* SVG Area Chart Sparkline */}
      <div className="mb-2 relative">
        <svg
          width={svgPath.width}
          height={svgPath.height}
          viewBox={`0 0 ${svgPath.width} ${svgPath.height}`}
          className="w-full h-8"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={card.accentColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={card.accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={svgPath.areaPath}
            fill={`url(#grad-${card.id})`}
          />
          {/* Stroke line with glow */}
          <path
            d={svgPath.linePath}
            fill="none"
            stroke={card.accentColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 3px ${card.accentColor}88)` }}
          />
        </svg>
      </div>

      {/* Secondary metrics */}
      {secondaryMetrics.length > 0 && (
        <div className="space-y-1">
          {secondaryMetrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted">{metric.label}</span>
              <span className="text-[11px] font-mono tabular-nums text-text-secondary">
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: last active + launch */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/30">
        <span className="text-[10px] text-text-muted font-mono">
          {card.lastActive ? timeAgo(card.lastActive) : '—'}
        </span>

        {hovered && card.execPath && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
            onClick={handleLaunch}
            className="text-[10px] font-medium text-accent hover:text-accent-emphasis px-2 py-0.5 rounded bg-accent/10 transition-colors"
          >
            Open
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
