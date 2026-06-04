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
}

export default function MetricCard({
  label, value, unit = '', delta, deltaUp,
  accentColor = 'var(--accent)', className = '', icon, sublabel,
}: MetricCardProps) {
  const count   = useMotionValue(0)
  const rounded = useTransform(count, v => Math.round(v))
  const ref     = useRef<HTMLSpanElement>(null)
  const once    = useRef(false)

  useEffect(() => {
    if (!once.current) {
      const ctrl = animate(count, value, { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] })
      once.current = true
      return ctrl.stop
    } else {
      count.set(value)
    }
  }, [value, count])

  useEffect(() =>
    rounded.on('change', v => { if (ref.current) ref.current.textContent = String(v) }),
  [rounded])

  const deltaColor = delta ? (deltaUp === false ? 'text-[#f85149]' : 'text-[#3fb950]') : ''

  return (
    <div
      className={`bg-surface-1 border border-border-default/75 rounded-md p-4 shadow-elevation-2 flex flex-col gap-1 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted">{label}</span>
        {icon && <span className="text-text-muted opacity-60">{icon}</span>}
      </div>
      <div className="flex items-end justify-between mt-1 gap-2">
        <div>
          <span className="flex items-baseline gap-0.5">
            <span
              ref={ref}
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: accentColor, textShadow: `0 0 16px ${accentColor}55` }}
            >
              {value}
            </span>
            {unit && <span className="text-sm font-mono text-text-muted ml-0.5">{unit}</span>}
          </span>
          {sublabel && <p className="text-[10px] text-text-muted mt-0.5 font-mono">{sublabel}</p>}
        </div>
      </div>
      {delta && (
        <p className={`text-[10px] font-mono mt-0.5 ${deltaColor}`}>
          {deltaUp !== false ? '↑' : '↓'} {delta}
        </p>
      )}
    </div>
  )
}
