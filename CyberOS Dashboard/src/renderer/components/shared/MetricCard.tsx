// CyberOS Dashboard — Metric Card (shared KPI card)

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

  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${accentColor}22`,
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: `${accentColor}0f`, filter: 'blur(12px)' }}
      />

      <div className="flex items-center justify-between mb-3 relative">
        <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">{label}</span>
        <span style={{ color: `${accentColor}99` }}>{icon}</span>
      </div>

      <span
        ref={displayRef}
        className="text-[28px] font-bold tabular-nums leading-none relative block"
        style={{ color: accentColor, textShadow: `0 0 16px ${accentColor}44` }}
      >
        {value}
      </span>

      {delta && (
        <p className="text-[10px] text-text-muted mt-2 relative">{delta}</p>
      )}
    </div>
  )
}
