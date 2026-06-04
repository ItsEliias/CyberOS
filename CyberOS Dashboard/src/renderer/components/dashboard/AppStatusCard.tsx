// CyberOS Dashboard — App Status Card

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AppCardData } from '../../types/ecosystem'
import { timeAgo } from '../../utils/timeAgo'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { normalizeEvents } from '../../utils/eventParser'

interface AppStatusCardProps {
  card: AppCardData
  index: number
}

const STATUS_STRINGS = ['Running', 'Inactive', 'No active session', 'Idle', 'Locked', 'Unlocked', 'Active', 'Offline', 'Online']

export default function AppStatusCard({ card, index }: AppStatusCardProps) {
  const [hovered, setHovered] = useState(false)
  const liveStats = useDashboardStore((s) => s.liveStats)
  const events = useDashboardStore((s) => s.events)

  const launchCount = useMemo(() => {
    const normalized = normalizeEvents(events)
    return normalized.filter(
      (e) =>
        e.app.toLowerCase() === card.id.toLowerCase() ||
        e.app.toLowerCase() === card.name.toLowerCase() ||
        e.event === 'session:started' && (e.app.toLowerCase().includes(card.id.toLowerCase()))
    ).length
  }, [events, card.id, card.name])

  const handleLaunch = () => {
    if (card.execPath) {
      window.electronAPI.launchApp(card.execPath)
    }
  }

  const sparklinePoints = useMemo(() => {
    const history = liveStats[card.id]?.history
    if (history && history.length >= 2) return history.map((s) => s.value)
    const seed = card.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const points: number[] = []
    for (let i = 0; i < 14; i++) {
      points.push(30 + Math.sin(seed + i * 0.8) * 20 + Math.cos(seed * 0.3 + i) * 10)
    }
    return points
  }, [card.id, liveStats])

  const svgPath = useMemo(() => {
    const width = 120
    const height = 28
    const step = width / (sparklinePoints.length - 1)
    const max = Math.max(...sparklinePoints)
    const min = Math.min(...sparklinePoints)
    const range = max - min || 1
    const pts = sparklinePoints.map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * (height - 2) - 1
      return `${x},${y}`
    })
    return {
      linePath: `M${pts.join(' L')}`,
      areaPath: `M${pts.join(' L')} L${width},${height} L0,${height} Z`,
      width,
      height,
    }
  }, [sparklinePoints])

  const primaryMetric = card.metrics[0]
  const secondaryMetrics = card.metrics.slice(1, 3)
  const isStatusString = typeof primaryMetric?.value === 'string' &&
    STATUS_STRINGS.includes(primaryMetric.value as string)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.06, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-xl cursor-default"
      style={{
        background: hovered ? 'rgba(19,21,37,0.92)' : 'var(--surface-2)',
        border: `1px solid ${card.active ? card.accentColor + '28' : 'rgba(42,51,71,0.4)'}`,
        borderTop: `2px solid ${card.active ? card.accentColor : card.accentColor + '40'}`,
        boxShadow: hovered
          ? `0 6px 24px rgba(0,0,0,0.45), inset 0 0 0 1px ${card.accentColor}18, inset 0 1px 0 ${card.accentColor}22`
          : `inset 0 1px 0 ${card.accentColor}14`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 180ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 180ms cubic-bezier(0.2,0.8,0.2,1), background 180ms',
      }}
    >
      {/* Subtle glow when active */}
      {card.active && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ background: `radial-gradient(ellipse at 10% 0%, ${card.accentColor}08 0%, transparent 60%)` }}
        />
      )}

      <div className="p-3 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.active ? 'status-dot-pulse' : ''}`}
              style={{
                backgroundColor: card.accentColor,
                opacity: card.active ? 1 : 0.3,
                '--pulse-rgb': '74,158,255',
                boxShadow: card.active ? `0 0 5px ${card.accentColor}` : 'none',
              } as React.CSSProperties}
            />
            <span className="text-[11px] font-semibold text-text-primary truncate">{card.name}</span>
          </div>
          <span
            className="text-[9px] font-mono font-medium shrink-0"
            style={{ color: card.active ? card.accentColor : 'var(--text-muted)' }}
          >
            {card.active ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* Primary metric */}
        {primaryMetric && (
          <div className="mb-1.5">
            {isStatusString ? (
              <span className="text-[11px] text-text-secondary">{primaryMetric.value}</span>
            ) : (
              <span
                className="text-[20px] font-bold tabular-nums leading-none"
                style={{
                  color: card.accentColor,
                  textShadow: `0 0 10px ${card.accentColor}55`,
                }}
              >
                {primaryMetric.value}
              </span>
            )}
            <span className="text-[9px] text-text-muted ml-1.5">{primaryMetric.label}</span>
          </div>
        )}

        {/* Sparkline — gradient fill: dark base → accent at line */}
        <div className="mb-2 relative overflow-hidden rounded-sm">
          <svg
            width={svgPath.width}
            height={svgPath.height}
            viewBox={`0 0 ${svgPath.width} ${svgPath.height}`}
            className="w-full"
            style={{ height: '34px', display: 'block' }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`g-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={card.accentColor} stopOpacity={card.active ? '0.58' : '0.15'} />
                <stop offset="55%"  stopColor={card.accentColor} stopOpacity={card.active ? '0.2' : '0.06'} />
                <stop offset="100%" stopColor="#0a0d17" stopOpacity="0" />
              </linearGradient>
              {/* Shimmer sweep — only rendered when card is active */}
              {card.active && (
                <linearGradient id={`shim-${card.id}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="transparent" />
                  <stop offset="40%"  stopColor="white" stopOpacity="0.05" />
                  <stop offset="60%"  stopColor="white" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="transparent" />
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    from="-1 0"
                    to="2 0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </linearGradient>
              )}
            </defs>
            {/* Area fill */}
            <path d={svgPath.areaPath} fill={`url(#g-${card.id})`} />
            {/* Shimmer overlay */}
            {card.active && (
              <rect x="0" y="0" width={svgPath.width} height={svgPath.height} fill={`url(#shim-${card.id})`} />
            )}
            {/* Stroke line */}
            <path
              d={svgPath.linePath}
              fill="none"
              stroke={card.accentColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={card.active ? 1 : 0.35}
              style={{ filter: card.active ? `drop-shadow(0 0 3px ${card.accentColor}88)` : 'none' }}
            />
          </svg>
        </div>

        {/* Secondary metrics */}
        {secondaryMetrics.length > 0 && (
          <div className="space-y-0.5 mb-1.5">
            {secondaryMetrics.map((m) => {
              const isStatus = typeof m.value === 'string' && STATUS_STRINGS.includes(m.value as string)
              return (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[9px] text-text-muted">{m.label}</span>
                  <span
                    className="text-[10px] font-mono tabular-nums"
                    style={{ color: isStatus ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                  >
                    {m.value}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid rgba(42,51,71,0.25)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-text-muted font-mono">
              {card.lastActive ? timeAgo(card.lastActive) : '—'}
            </span>
            {launchCount > 0 && (
              <span
                className="text-[8px] font-mono tabular-nums px-1 py-0.5 rounded"
                style={{
                  background: 'rgba(139,148,158,0.1)',
                  color: 'var(--text-muted)',
                  border: '1px solid rgba(139,148,158,0.15)',
                }}
              >
                {launchCount}x
              </span>
            )}
          </div>
          {card.execPath && (
            <motion.button
              initial={false}
              animate={{ opacity: hovered ? 1 : 0.35, scale: hovered ? 1 : 0.92 }}
              transition={{ duration: 0.15 }}
              onClick={handleLaunch}
              className="text-[9px] font-semibold px-2 py-0.5 rounded-md"
              style={{
                color: card.accentColor,
                background: hovered ? `${card.accentColor}20` : `${card.accentColor}0a`,
                border: `1px solid ${card.accentColor}${hovered ? '40' : '20'}`,
                transition: 'background 150ms, border-color 150ms',
                cursor: 'pointer',
              }}
            >
              Launch
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
