// CyberOS Dashboard — Operator Profile Card (Hero Panel)
// Dominates the left panel with large skill radar centrepiece and glowing display numbers

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
    <div className="glass-card overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center">
          <span className="text-sm font-bold text-accent">
            {operatorName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">{operatorName}</h3>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-success status-dot-pulse"
              style={{ '--pulse-color': 'rgba(63, 185, 80, 0.4)' } as React.CSSProperties}
            />
            <span className="text-[10px] text-text-secondary">Active Operator</span>
          </div>
        </div>
        {streakStatus === 'at_risk' && (
          <span className="ml-auto text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded font-medium">
            STREAK AT RISK
          </span>
        )}
      </div>

      {/* Skill Radar — Centrepiece */}
      <div className="flex justify-center mb-4">
        <SkillRadar
          skills={profile?.skillProgress ?? {}}
          size={250}
          showLabels={true}
        />
      </div>

      {/* Hero Metrics — Large display numbers */}
      <div className="grid grid-cols-4 gap-3">
        <HeroMetric
          label="Streak"
          value={streak}
          suffix="d"
          color="#d29922"
        />
        <HeroMetric
          label="Flags"
          value={flags}
          color="#3fb950"
        />
        <HeroMetric
          label="Labs"
          value={labs}
          color="#4a9eff"
        />
        <HeroMetric
          label="Creds"
          value={creds}
          color="#f78166"
        />
      </div>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  suffix = '',
  color,
}: {
  label: string
  value: number
  suffix?: string
  color: string
}) {
  return (
    <div className="text-center">
      <span
        className="text-2xl font-bold tabular-nums block metric-glow"
        style={{
          color,
          '--glow-color': `${color}80`,
          textShadow: `0 0 12px ${color}55`,
        } as React.CSSProperties}
      >
        {value}{suffix}
      </span>
      <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  )
}
