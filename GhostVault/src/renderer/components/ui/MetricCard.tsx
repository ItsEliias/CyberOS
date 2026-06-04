import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface MetricCardProps {
  label: string
  value: number
  unit?: string
  delta?: string
  deltaUp?: boolean
  accentColor?: string
  className?: string
  icon?: React.ReactNode
  sublabel?: string
  maxValue?: number
}

export default function MetricCard({
  label,
  value,
  unit = '',
  delta,
  deltaUp,
  accentColor = 'var(--accent)',
  className = '',
  icon,
  sublabel,
  maxValue,
}: MetricCardProps) {
  const count   = useMotionValue(0)
  const rounded = useTransform(count, v => Math.round(v))
  const ref     = useRef<HTMLSpanElement>(null)
  const once    = useRef(false)

  useEffect(() => {
    if (!once.current) {
      const ctrl = animate(count, value, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] })
      once.current = true
      return ctrl.stop
    } else {
      animate(count, value, { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] })
    }
  }, [value, count])

  useEffect(() =>
    rounded.on('change', v => { if (ref.current) ref.current.textContent = String(v) }),
  [rounded])

  const deltaColor = delta
    ? deltaUp === false ? 'text-[#f85149]' : 'text-[#3fb950]'
    : ''

  const progressPct = maxValue && maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : null

  return (
    <div
      className={`relative bg-surface-1 border border-border-default/75 rounded-lg p-4 shadow-elevation-2 flex flex-col gap-1 overflow-hidden card-hover ${className}`}
    >
      {/* Accent top strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg"
        style={{ background: `linear-gradient(90deg, ${accentColor}00 0%, ${accentColor}60 50%, ${accentColor}00 100%)` }}
      />

      <div className="flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-widest text-text-muted">
          {label}
        </span>
        {icon && <span className="text-text-muted opacity-60">{icon}</span>}
      </div>

      <div className="flex items-end justify-between mt-1 gap-2">
        <div>
          <span className="flex items-baseline gap-0.5">
            <span
              ref={ref}
              className="text-2xl font-bold tabular-nums leading-none"
              style={{
                color: accentColor,
                textShadow: `0 0 16px ${accentColor}55, 0 0 32px ${accentColor}22`,
              }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm font-mono text-text-muted ml-0.5">{unit}</span>
            )}
          </span>
          {sublabel && (
            <p className="text-2xs text-text-muted mt-0.5 font-mono">{sublabel}</p>
          )}
        </div>
      </div>

      {delta && (
        <p className={`text-2xs font-mono mt-0.5 ${deltaColor}`}>
          {deltaUp !== false ? '↑' : '↓'} {delta}
        </p>
      )}

      {/* Optional progress bar at bottom */}
      {progressPct !== null && (
        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(42,51,71,0.4)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: accentColor, opacity: 0.7 }}
            initial={{ width: '0%' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
          />
        </div>
      )}
    </div>
  )
}
