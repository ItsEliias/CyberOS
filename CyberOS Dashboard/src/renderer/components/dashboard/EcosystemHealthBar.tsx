// CyberOS Dashboard — Ecosystem Health Bar

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { buildAppCards } from '../../utils/configParser'
import { timeAgo } from '../../utils/timeAgo'

function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = current
    startRef.current = null
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCurrent(Math.round(fromRef.current + (target - fromRef.current) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return current
}

/** Convert a 6-digit hex colour to an "r,g,b" string for use with --pulse-rgb */
function hexToRgbStr(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '74,158,255'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

// Number of segments in the progress bar
const SEGMENTS = 20

/** 5-point sparkline for tooltip — deterministic mock from seed string */
function MiniSparkline({ color, seed, active }: { color: string; seed: string; active: boolean }) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const s = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return 10 + Math.abs(Math.sin(s * 0.1 + i * 1.3) * 14 + Math.cos(s * 0.07 + i * 0.9) * 6)
  })
  const W = 80; const H = 20
  const step = W / (pts.length - 1)
  const max = Math.max(...pts); const min = Math.min(...pts); const range = max - min || 1
  const coords = pts.map((v, i) => ({
    x: i * step,
    y: H - ((v - min) / range) * (H - 2) - 1,
  }))
  const linePath = `M${coords.map((p) => `${p.x},${p.y}`).join(' L')}`
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`
  const dotId = `dot-${seed.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={dotId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={active ? '0.45' : '0.15'} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${dotId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity={active ? 0.9 : 0.4}
        style={{ filter: active ? `drop-shadow(0 0 3px ${color}88)` : 'none' }}
      />
      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} opacity={active ? 0.85 : 0.3} />
      ))}
    </svg>
  )
}

export default function EcosystemHealthBar() {
  const config = useDashboardStore((s) => s.config)
  const cards = buildAppCards(config)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const activeCount = cards.filter((c) => c.active).length
  const healthPct = cards.length > 0 ? Math.round((activeCount / cards.length) * 100) : 0
  const healthColor = healthPct >= 75 ? '#3fb950' : healthPct >= 40 ? '#d29922' : '#f85149'

  // Animated count-up for the online count
  const animatedActive = useCountUp(activeCount, 700)

  // How many segments should be filled
  const filledSegments = Math.round((healthPct / 100) * SEGMENTS)

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          Ecosystem Health
        </span>
        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] font-bold font-mono tabular-nums"
            style={{ color: healthColor, textShadow: `0 0 8px ${healthColor}66` }}
          >
            {healthPct}%
          </span>
          <span className="text-[10px] font-mono tabular-nums text-text-muted">
            {animatedActive}/{cards.length}
          </span>
        </div>
      </div>

      {/* Segmented progress bar with tick marks */}
      <div className="mb-3">
        <div className="relative flex items-center gap-px h-3">
          {Array.from({ length: SEGMENTS }).map((_, idx) => {
            const isFilled = idx < filledSegments
            const isLast = idx === filledSegments - 1
            return (
              <motion.div
                key={idx}
                className="flex-1 h-full rounded-[2px] relative overflow-hidden"
                style={{
                  background: isFilled ? 'transparent' : 'rgba(42,51,71,0.45)',
                }}
                initial={{ opacity: 0, scaleY: 0.4 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: idx * 0.025, duration: 0.25, ease: 'easeOut' }}
              >
                {isFilled && (
                  <motion.div
                    className="absolute inset-0 rounded-[2px]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      delay: idx * 0.03,
                      duration: 0.35,
                      type: 'spring',
                      stiffness: 80,
                      damping: 14,
                    }}
                    style={{
                      background: `linear-gradient(90deg, ${healthColor}cc, ${healthColor})`,
                      boxShadow: isLast ? `0 0 6px ${healthColor}99` : 'none',
                      transformOrigin: 'left center',
                    }}
                  />
                )}
              </motion.div>
            )
          })}

          {/* Tick marks at 25%, 50%, 75% */}
          {[5, 10, 15].map((tick) => (
            <div
              key={tick}
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${(tick / SEGMENTS) * 100}%`,
                background: 'rgba(255,255,255,0.08)',
                zIndex: 1,
              }}
            />
          ))}
        </div>

        {/* Tick labels */}
        <div className="relative flex mt-0.5" style={{ height: '10px' }}>
          {[25, 50, 75].map((pct) => (
            <span
              key={pct}
              className="absolute text-[8px] text-text-muted font-mono"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              {pct}
            </span>
          ))}
        </div>
      </div>

      {/* App dots */}
      <div className="flex items-end justify-between">
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative flex flex-col items-center gap-1 cursor-default"
            onMouseEnter={() => setHoveredId(card.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${card.active ? 'status-dot-pulse' : ''}`}
              style={{
                backgroundColor: card.accentColor,
                opacity: card.active ? 1 : 0.22,
                '--pulse-rgb': hexToRgbStr(card.accentColor),
                boxShadow: card.active ? `0 0 6px ${card.accentColor}99` : 'none',
              } as React.CSSProperties}
            />
            <span
              className="text-[8px] font-medium max-w-[44px] truncate text-center"
              style={{ color: card.active ? 'var(--text-secondary)' : 'var(--text-muted)' }}
            >
              {card.name.length > 6 ? card.name.slice(0, 6) : card.name}
            </span>

            {/* Tooltip with sparkline */}
            {hoveredId === card.id && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute z-50"
                style={{
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '6px',
                  background: 'rgba(13,14,24,0.97)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${card.accentColor}30`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  boxShadow: `var(--elevation-3), 0 0 0 1px rgba(255,255,255,0.04)`,
                  minWidth: '100px',
                }}
              >
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: card.accentColor }}>
                  {card.name}
                </p>
                <p className="text-[10px] text-text-secondary mb-2">
                  {card.active ? 'Online' : `Last: ${timeAgo(card.lastActive)}`}
                </p>
                {/* 5-point mock sparkline */}
                <MiniSparkline color={card.accentColor} seed={card.id} active={card.active} />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
