// CyberOS Dashboard — Operator Profile Card (Hero Panel)

import { useEffect, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { getStreakStatus } from '../../utils/timeAgo'
import SkillRadar from './SkillRadar'

export default function OperatorProfileCard() {
  const config = useDashboardStore((s) => s.config)
  const profile = config.operator_profile

  const operatorName = profile?.operatorName ?? 'Operator'
  const streak = profile?.currentStreak ?? 0
  const flags = profile?.totalFlags ?? 0
  const labs = profile?.totalLabsCompleted ?? 0
  const creds = profile?.totalCredentials ?? 0
  const streakStatus = getStreakStatus(profile?.lastActiveDate)

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col h-full relative"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-2), inset 0 1px 0 rgba(74,158,255,0.12)',
      }}
    >
      {/* Subtle radial glow behind radar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(74,158,255,0.06) 0%, transparent 65%)',
        }}
      />

      {/* Radar — centrepiece with graph-paper background texture */}
      <div
        className="flex justify-center flex-1 items-center pt-4 relative"
        style={{ filter: 'drop-shadow(0 0 10px rgba(74,158,255,0.35))' }}
      >
        {/* Graph-paper grid texture */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.18 }}
        >
          <defs>
            <pattern id="radar-grid-small" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(74,158,255,0.4)" strokeWidth="0.5" />
            </pattern>
            <pattern id="radar-grid-large" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="url(#radar-grid-small)" />
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(74,158,255,0.7)" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-grid-large)" />
        </svg>
        <SkillRadar
          skills={profile?.skillProgress ?? {}}
          size={260}
          showLabels={true}
          fillColor="rgba(74, 158, 255, 0.12)"
          strokeColor="#4a9eff"
        />
      </div>

      {/* Operator identity */}
      <div className="text-center px-4 pb-2 relative">
        <h3 className="text-sm font-bold text-text-primary leading-tight">{operatorName}</h3>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-success status-dot-pulse"
            style={{ '--pulse-rgb': '63,185,80' } as React.CSSProperties}
          />
          <span className="text-[10px] text-text-secondary">Active Operator</span>
          {streakStatus === 'at_risk' && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ background: 'rgba(210,153,34,0.12)', border: '1px solid rgba(210,153,34,0.3)', color: 'var(--sev-medium)' }}
            >
              Streak at risk
            </span>
          )}
        </div>
      </div>

      {/* Metric grid */}
      <div
        className="grid grid-cols-2 gap-1.5 px-3 pb-3 relative"
        style={{ borderTop: '1px solid rgba(42,51,71,0.35)', paddingTop: '10px' }}
      >
        <HeroMetric label="Labs" value={labs} index={0} />
        <HeroMetric label="Flags" value={flags} index={1} />
        <HeroMetric label="Credentials" value={creds} index={2} />
        <HeroMetric label="Streak" value={streak} suffix="d" index={3} />
      </div>
    </div>
  )
}

function HeroMetric({ label, value, suffix = '', index = 0 }: { label: string; value: number; suffix?: string; index?: number }) {
  const motionVal = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1.1, ease: 'easeOut' })
    const unsub = motionVal.on('change', (v) => setDisplay(Math.round(v)))
    return () => { controls.stop(); unsub() }
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.065, ease: 'easeOut' }}
      className="text-center py-2 rounded-lg"
      style={{
        background: 'rgba(74,158,255,0.05)',
        border: '1px solid rgba(74,158,255,0.1)',
      }}
    >
      <div
        className="text-[22px] font-bold tabular-nums leading-none mb-1"
        style={{ color: 'var(--accent)', textShadow: '0 0 12px rgba(74,158,255,0.35)' }}
      >
        {display}{suffix}
      </div>
      <div className="text-[9px] text-text-muted uppercase tracking-wider">{label}</div>
    </motion.div>
  )
}
