// CyberOS Dashboard — Metric Card Component
// Numeric KPI card with icon, large number, and optional delta
// Glassmorphism + metric glow styling

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface MetricCardProps {
  label: string
  value: number
  icon: JSX.Element
  delta?: string
  accentColor?: string
}

export default function MetricCard({ label, value, icon, delta, accentColor = '#4a9eff' }: MetricCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const displayRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!hasAnimated.current) {
      const controls = animate(count, value, { duration: 0.6, ease: 'easeOut' })
      hasAnimated.current = true
      return controls.stop
    } else {
      count.set(value)
    }
  }, [value, count])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = String(v)
      }
    })
    return unsubscribe
  }, [rounded])

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">{label}</span>
        <span className="text-text-muted">{icon}</span>
      </div>
      <span
        ref={displayRef}
        className="text-lg font-bold tabular-nums metric-glow"
        style={{
          color: accentColor,
          '--glow-color': `${accentColor}80`,
          textShadow: `0 0 12px ${accentColor}66, 0 0 24px ${accentColor}1a`,
        } as React.CSSProperties}
      >
        {value}
      </span>
      {delta && (
        <p className="text-[10px] text-text-muted mt-1">{delta}</p>
      )}
    </div>
  )
}
