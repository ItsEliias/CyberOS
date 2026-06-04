import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { SparklineChart } from './SparklineChart'

interface MetricCardProps {
  label: string
  value: number
  unit?: string
  delta?: string
  deltaUp?: boolean
  sparkData?: number[]
  accentColor?: string
  className?: string
  icon?: React.ReactNode
  sublabel?: string
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

  const deltaColor = delta
    ? deltaUp === false ? '#f85149' : '#3fb950'
    : ''

  return (
    <div
      className={`rounded-md p-4 border flex flex-col gap-1 ${className}`}
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{icon}</span>}
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
                fontFamily: 'var(--font-mono)',
              }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm font-mono" style={{ color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>
            )}
          </span>
          {sublabel && (
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
          )}
        </div>

        {sparkData && sparkData.length > 1 && (
          <SparklineChart data={sparkData} color={accentColor} />
        )}
      </div>

      {delta && (
        <p className="text-[10px] font-mono mt-0.5" style={{ color: deltaColor }}>
          {deltaUp !== false ? '↑' : '↓'} {delta}
        </p>
      )}
    </div>
  )
}
