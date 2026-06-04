// CyberOS Dashboard — Metric Card (shared KPI card)

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

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
  const [hovered, setHovered] = useState(false)

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: hovered ? `rgba(19,21,37,0.9)` : 'var(--surface-2)',
        border: `1px solid ${hovered ? accentColor + '40' : accentColor + '22'}`,
        boxShadow: hovered
          ? `var(--elevation-2), 0 0 20px ${accentColor}18`
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

      {delta && (
        <p className="text-[10px] text-text-muted mt-2 relative">{delta}</p>
      )}
    </div>
  )
}
