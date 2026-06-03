// CyberOS Dashboard — Operator Profile Card
// Shows operator name, streak, flags, labs, credentials, and skill radar

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
    <div className="bg-bg-elevated/75 backdrop-blur-sm border border-border-default/60 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
          <span className="text-xs font-bold text-accent">
            {operatorName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <h3 className="text-md font-bold text-text-primary">{operatorName}</h3>
          <span className="text-xs text-text-secondary">Cybersecurity Operator</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Streak */}
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              streak > 0 ? 'text-warning' : 'text-text-muted'
            }`}
            style={streak > 0 ? { textShadow: '0 0 20px rgba(210, 153, 34, 0.4)' } : {}}
          >
            {streak} day streak
          </span>
          {streakStatus === 'at_risk' && (
            <span className="text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded font-medium">
              ⚠ At risk
            </span>
          )}
        </div>

        {/* Flags */}
        <div className="flex items-center gap-2">
          <span className="text-base">⚑</span>
          <span className="text-sm text-text-primary font-semibold tabular-nums">{flags} flags</span>
        </div>

        {/* Labs */}
        <div className="flex items-center gap-2">
          <span className="text-base">🔬</span>
          <span className="text-sm text-text-primary font-semibold tabular-nums">{labs} labs</span>
        </div>

        {/* Credentials */}
        <div className="flex items-center gap-2">
          <span className="text-base">🔑</span>
          <span className="text-sm text-text-primary font-semibold tabular-nums">{creds} creds</span>
        </div>
      </div>

      {/* Skill Radar */}
      <div className="px-4 pb-4">
        <SkillRadar
          skills={profile?.skillProgress ?? {}}
          size={180}
        />
      </div>
    </div>
  )
}
