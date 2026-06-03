// CyberOS Dashboard — Metric Card Component
// Numeric KPI card with icon, large number, and optional delta

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
    <div className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary font-medium">{label}</span>
        <span className="text-text-secondary">{icon}</span>
      </div>
      <span
        ref={displayRef}
        className="text-2xl font-bold text-text-primary tabular-nums"
        style={{ textShadow: `0 0 20px ${accentColor}66, 0 0 40px ${accentColor}1a` }}
      >
        {value}
      </span>
      {delta && (
        <p className="text-xs text-text-secondary mt-1">{delta}</p>
      )}
    </div>
  )
}
