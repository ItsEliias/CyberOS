// CyberOS Dashboard — Skill Radar Large (Profile view)

import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import SkillRadar from '../dashboard/SkillRadar'

const LEVEL_COLORS: Record<string, string> = {
  Expert: '#3fb950',
  Advanced: '#4a9eff',
  Intermediate: '#d29922',
  'Adv. Beginner': '#ff8c42',
  Beginner: '#8b949e',
}

function getSkillLevel(points: number): string {
  if (points >= 80) return 'Expert'
  if (points >= 60) return 'Advanced'
  if (points >= 40) return 'Intermediate'
  if (points >= 20) return 'Adv. Beginner'
  return 'Beginner'
}

export default function SkillRadarLarge() {
  const config = useDashboardStore((s) => s.config)
  const skills = config.operator_profile?.skillProgress ?? {}

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-4">
        Skill Radar
      </span>

      <div
        className="flex justify-center mb-4"
        style={{ filter: 'drop-shadow(0 0 10px rgba(74, 158, 255, 0.35))' }}
      >
        <SkillRadar
          skills={skills}
          size={280}
          showLabels={true}
          fillColor="rgba(74, 158, 255, 0.12)"
          strokeColor="#4a9eff"
        />
      </div>

      {/* Skill bars */}
      <div className="space-y-2 mt-2">
        {Object.entries(skills).map(([key, rawValue], i) => {
          const value = rawValue as number
          const label = key === 'activeDirectory' ? 'Active Directory' : key.charAt(0).toUpperCase() + key.slice(1)
          const level = getSkillLevel(value)
          const levelColor = LEVEL_COLORS[level]
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[11px] text-text-secondary w-28 shrink-0">{label}</span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(42,51,71,0.5)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: levelColor, boxShadow: `0 0 4px ${levelColor}88` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] text-text-primary font-mono w-7 text-right tabular-nums shrink-0">
                {value}
              </span>
              <span
                className="text-[9px] font-medium w-20 shrink-0"
                style={{ color: levelColor }}
              >
                {level}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
