// CyberOS Dashboard — Operator Profile Card (Hero Panel)
// Fix #2: Radar centrepiece with blue glow, operator name below, 4 hero metrics in #4a9eff
// Card fills the entire left panel height

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
    <div className="glass-card overflow-hidden p-4 flex flex-col h-full">
      {/* Skill Radar — Centrepiece with blue glow */}
      <div
        className="flex justify-center flex-1 items-center"
        style={{ filter: 'drop-shadow(0 0 6px rgba(74, 158, 255, 0.5))' }}
      >
        <SkillRadar
          skills={profile?.skillProgress ?? {}}
          size={250}
          showLabels={true}
        />
      </div>

      {/* Operator identity — below radar */}
      <div className="text-center mt-3 mb-4">
        <h3 className="text-sm font-bold text-text-primary">{operatorName}</h3>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span
            className="w-2 h-2 rounded-full bg-success status-dot-pulse"
            style={{ '--pulse-color': 'rgba(63, 185, 80, 0.4)' } as React.CSSProperties}
          />
          <span className="text-[10px] text-text-secondary">Active Operator</span>
          {streakStatus === 'at_risk' && (
            <span className="text-[9px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-medium ml-2">
              STREAK AT RISK
            </span>
          )}
        </div>
      </div>

      {/* Hero Metrics — 4 columns, text-2xl in #4a9eff with glow */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border-subtle/40">
        <HeroMetric label="Streak" value={streak} suffix="d" />
        <HeroMetric label="Flags" value={flags} />
        <HeroMetric label="Labs" value={labs} />
        <HeroMetric label="Creds" value={creds} />
      </div>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  suffix = '',
}: {
  label: string
  value: number
  suffix?: string
}) {
  return (
    <div className="text-center">
      <span
        className="text-2xl font-bold tabular-nums block"
        style={{
          color: '#4a9eff',
          textShadow: '0 0 10px rgba(74, 158, 255, 0.4)',
        }}
      >
        {value}{suffix}
      </span>
      <span className="text-[9px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  )
}
