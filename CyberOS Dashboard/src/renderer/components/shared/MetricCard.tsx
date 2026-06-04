// CyberOS Dashboard — Metric Card (shared KPI card)

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface MetricCardProps {
  label: string
  value: number
  icon: JSX.Element
  delta?: string
  /** true = value went up (green ↑), false = down (red ↓), undefined = neutral */
  deltaUp?: boolean
  accentColor?: string
  /** Auto-derive a "+X since yesterday" delta from the value when no delta is passed */
  autoDelta?: boolean
}

/** Derive a stable demo delta (10–15 % of value) from the value */
function deriveDelta(value: number): { text: string; up: boolean } {
  const seed = Math.abs(value * 31 + 7) % 100
  const pct = 10 + (seed % 6)
  const amount = Math.max(1, Math.round(value * pct / 100))
  const up = seed % 3 !== 0
  return { text: `${amount} since yesterday`, up }
}

export default function MetricCard({ label, value, icon, delta, deltaUp, accentColor = '#4a9eff', autoDelta = false }: MetricCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const displayRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)
  const [hovered, setHovered] = useState(false)
  const [shimmerPlaying, setShimmerPlaying] = useState(true)

  useEffect(() => {
    if (!hasAnimated.current) {
      const controls = animate(count, value, { duration: 0.8, ease: 'easeOut' })
      hasAnimated.current = true
      return controls.stop
    } else {
      count.set(value)
    }
  }, [value, count])

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      if (displayRef.current) displayRef.current.textContent = String(v)
    })
    return unsub
  }, [rounded])

  // Play shimmer once on mount, then stop
  useEffect(() => {
    const id = setTimeout(() => setShimmerPlaying(false), 1200)
    return () => clearTimeout(id)
  }, [])

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: hovered ? `rgba(19,21,37,0.9)` : 'var(--surface-2)',
        border: `1px solid ${hovered ? accentColor + '40' : accentColor + '22'}`,
        boxShadow: hovered
          ? `var(--elevation-2), 0 0 20px ${accentColor}18`
          : shimmerPlaying
            ? `var(--elevation-1), 0 0 18px ${accentColor}2a`
            : 'var(--elevation-1)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 180ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 180ms, background 180ms, border-color 180ms',
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
        style={{
          background: `${accentColor}${hovered ? '18' : '0f'}`,
          filter: 'blur(12px)',
          transition: 'background 180ms',
        }}
      />

      {/* Mount shimmer sweep — plays once on initial render */}
      {shimmerPlaying && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: '-100%', opacity: 0.7 }}
          animate={{ x: '200%', opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          style={{
            background: `linear-gradient(105deg, transparent 30%, ${accentColor}28 50%, transparent 70%)`,
            zIndex: 10,
          }}
        />
      )}

      <div className="flex items-center justify-between mb-3 relative">
        <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">{label}</span>
        <span style={{ color: `${accentColor}${hovered ? 'cc' : '99'}`, transition: 'color 180ms' }}>{icon}</span>
      </div>

      <span
        ref={displayRef}
        className="text-[28px] font-bold tabular-nums leading-none relative block"
        style={{
          color: accentColor,
          textShadow: `0 0 ${hovered ? '24px' : '16px'} ${accentColor}${hovered ? '66' : '44'}`,
          transition: 'text-shadow 180ms',
        }}
      >
        {value}
      </span>

      {(() => {
        const derived = autoDelta && !delta && value > 0 ? deriveDelta(value) : null
        const activeDelta = delta ?? derived?.text
        const activeDeltaUp = delta !== undefined ? deltaUp : derived?.up
        if (!activeDelta) return null
        return (
          <div className="flex items-center gap-1 mt-2 relative">
            <span
              className="text-[11px] font-bold leading-none"
              style={{ color: activeDeltaUp ? '#3fb950' : '#f85149' }}
            >
              {activeDeltaUp ? '+' : '−'}
            </span>
            <p
              className="text-[10px] font-mono"
              style={{ color: activeDeltaUp === undefined ? 'var(--text-muted)' : activeDeltaUp ? '#3fb950' : '#f85149' }}
            >
              {activeDelta}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
