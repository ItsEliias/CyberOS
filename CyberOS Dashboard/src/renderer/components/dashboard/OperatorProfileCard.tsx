// CyberOS Dashboard — Operator Profile Card (Hero Panel)
// Fix #2: 280px radar centrepiece, fill rgba(74,158,255,0.15), stroke #4a9eff
// Glow: drop-shadow(0 0 8px rgba(74,158,255,0.4)), labels text-xs font-mono
// Below: 2×2 metric grid (Total Labs / Flags / Credentials / Streak)

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
      {/* Skill Radar — Centrepiece, 280px, with blue glow */}
      <div
        className="flex justify-center flex-1 items-center"
        style={{ filter: 'drop-shadow(0 0 8px rgba(74, 158, 255, 0.4))' }}
      >
        <SkillRadar
          skills={profile?.skillProgress ?? {}}
          size={280}
          showLabels={true}
          fillColor="rgba(74, 158, 255, 0.15)"
          strokeColor="#4a9eff"
        />
      </div>

      {/* Operator identity — below radar */}
      <div className="text-center mt-2 mb-3">
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

      {/* 2×2 Metric Grid */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-subtle/40">
        <HeroMetric label="Total Labs" value={labs} />
        <HeroMetric label="Flags" value={flags} />
        <HeroMetric label="Credentials" value={creds} />
        <HeroMetric label="Streak" value={streak} suffix="d" />
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
    <div className="text-center py-2 rounded-md" style={{ background: 'rgba(74, 158, 255, 0.05)' }}>
      <span
        className="text-xl font-bold tabular-nums block"
        style={{
          color: '#4a9eff',
          textShadow: '0 0 10px rgba(74, 158, 255, 0.35)',
        }}
      >
        {value}{suffix}
      </span>
      <span className="text-[9px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  )
}
