import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { SparklineChart } from './SparklineChart'

interface MetricCardProps {
  label: string
  value: number
  /** Format string e.g. "" | "%" | "ms" */
  unit?: string
  delta?: string
  deltaUp?: boolean
  sparkData?: number[]
  accentColor?: string
  className?: string
  icon?: React.ReactNode
  sublabel?: string
  /** If true, auto-derive a delta from the value (10-15% demo range) */
  autoDelta?: boolean
}

/** Derive a stable demo delta from the metric value (10-15% of value) */
function deriveDelta(value: number): { text: string; up: boolean } {
  // Use the value itself as a stable seed so it doesn't change on re-renders
  const seed = Math.abs(value * 31 + 7) % 100
  const pct = 10 + (seed % 6) // 10–15 %
  const delta = Math.max(1, Math.round(value * pct / 100))
  const up = seed % 3 !== 0 // 2/3 chance positive
  return { text: `${delta}${''} since yesterday`, up }
}

export default function MetricCard({
  label,
  value,
  unit = '',
  delta,
  deltaUp,
  sparkData,
  accentColor = 'var(--accent)',
  className = '',
  icon,
  sublabel,
  autoDelta = false,
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

  const derivedDelta = autoDelta && !delta && value > 0 ? deriveDelta(value) : null
  const activeDelta = delta ?? derivedDelta?.text
  const activeDeltaUp = delta ? deltaUp : derivedDelta?.up

  const deltaColor = activeDelta
    ? activeDeltaUp === false ? 'text-[#f85149]' : 'text-[#3fb950]'
    : ''

  return (
    <div
      className={`bg-surface-1 border border-border-default/75 rounded-md p-4 shadow-elevation-2 flex flex-col gap-1 ${className}`}
    >
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

        {sparkData && sparkData.length > 1 && (
          <SparklineChart data={sparkData} color={accentColor} />
        )}
      </div>

      {activeDelta && (
        <p className={`text-2xs font-mono mt-0.5 ${deltaColor}`}>
          {activeDeltaUp !== false ? '+' : '−'} {activeDelta}
        </p>
      )}
    </div>
  )
}
