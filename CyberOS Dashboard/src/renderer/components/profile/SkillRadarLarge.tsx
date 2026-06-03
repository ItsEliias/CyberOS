// CyberOS Dashboard — Skill Radar Large Component
// Full-size version of the radar chart with historical comparison

import { useDashboardStore } from '../../stores/useDashboardStore'
import SkillRadar from '../dashboard/SkillRadar'

export default function SkillRadarLarge() {
  const config = useDashboardStore((s) => s.config)
  const skills = config.operator_profile?.skillProgress ?? {}

  return (
    <div className="glass-card p-4">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-4">
        Skill Radar
      </p>

      <div className="flex justify-center">
        <SkillRadar
          skills={skills}
          size={300}
          showLabels={true}
        />
      </div>

      {/* Skill breakdown */}
      <div className="mt-6 space-y-2">
        {Object.entries(skills).map(([key, value]) => {
          const label = key === 'activeDirectory' ? 'Active Directory' : key.charAt(0).toUpperCase() + key.slice(1)
          const level = getSkillLevel(value as number)
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-28 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-bg-interactive rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${value}%`, boxShadow: '0 0 4px rgba(74, 158, 255, 0.6)' }}
                />
              </div>
              <span className="text-xs text-text-primary font-mono w-8 text-right tabular-nums">
                {value as number}
              </span>
              <span className="text-[10px] text-text-muted w-24">{level}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getSkillLevel(points: number): string {
  if (points >= 80) return 'Expert'
  if (points >= 60) return 'Advanced'
  if (points >= 40) return 'Intermediate'
  if (points >= 20) return 'Adv. Beginner'
  return 'Beginner'
}
