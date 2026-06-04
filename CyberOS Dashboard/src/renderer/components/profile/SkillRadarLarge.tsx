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

function getPercentile(points: number): string {
  if (points >= 95) return 'Top 5%'
  if (points >= 85) return 'Top 15%'
  if (points >= 70) return 'Top 30%'
  if (points >= 55) return 'Top 45%'
  if (points >= 40) return 'Top 60%'
  return 'Top 75%'
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
      <div className="space-y-2.5 mt-2">
        {Object.entries(skills).map(([key, rawValue], i) => {
          const value = rawValue as number
          const label = key === 'activeDirectory' ? 'Active Directory' : key.charAt(0).toUpperCase() + key.slice(1)
          const level = getSkillLevel(value)
          const levelColor = LEVEL_COLORS[level]
          const isHighLevel = level === 'Expert' || level === 'Advanced'
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[11px] text-text-secondary w-28 shrink-0">{label}</span>
              <div
                className="flex-1 h-2.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(42,51,71,0.45)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isHighLevel
                      ? `linear-gradient(90deg, ${levelColor}bb, ${levelColor})`
                      : levelColor,
                    boxShadow: isHighLevel ? `0 0 8px ${levelColor}aa` : `0 0 3px ${levelColor}55`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.75, delay: i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
                />
              </div>
              <span className="text-[11px] text-text-primary font-mono w-7 text-right tabular-nums shrink-0">
                {value}
              </span>
              <div className="flex flex-col items-center gap-0.5 w-20 shrink-0">
                <span
                  className="text-[9px] font-semibold w-full px-1.5 py-0.5 rounded text-center"
                  style={{
                    color: levelColor,
                    background: `${levelColor}12`,
                    border: `1px solid ${levelColor}28`,
                  }}
                >
                  {level}
                </span>
                <span className="text-[8px] text-text-muted font-mono tabular-nums">
                  {getPercentile(value)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
