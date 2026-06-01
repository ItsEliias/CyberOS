// OperatorProfile — compact header + expandable "Full Profile" panel
// ItsEliias // CyberOS

import { useState } from 'react'
import { useStore } from '../store'
import SkillRadar     from './SkillRadar'
import StreakCalendar from './StreakCalendar'
import BadgeDisplay   from './BadgeDisplay'

interface StatPillProps { label: string; value: string | number }

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 bg-bg/60 rounded border border-border/50">
      <span className="text-xs font-semibold text-text">{value}</span>
      <span className="text-[9px] text-muted/70 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  )
}

export default function OperatorProfile() {
  const config = useStore(s => s.config)
  const op     = config.operator_profile
  const ctx    = config.shared_context

  const [expanded, setExpanded] = useState(false)

  const name  = op?.operatorName
    ?? ctx?.updatedBy
    ?? config.cyberos?.name
    ?? '—'

  const labs     = op?.totalLabsCompleted ?? 0
  const streak   = op?.currentStreak      ?? 0
  const flags    = op?.totalFlags         ?? 0
  const creds    = op?.totalCredentials   ?? 0
  const skills   = op?.skillProgress      ?? {}
  const activity = op?.activityDates      ?? []

  const streakLabel = streak > 0 ? `${streak}d` : '—'
  const labsLabel   = labs  > 0 ? labs : '—'
  const flagsLabel  = flags > 0 ? flags : '—'

  return (
    <div className="mt-4 bg-panel border border-border rounded-lg overflow-hidden">
      {/* ── Compact header row ── */}
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5.5" r="2.5" stroke="#4a9eff" strokeWidth="1.3" />
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="#4a9eff" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-text uppercase tracking-widest truncate">{name}</p>
          <p className="text-[10px] text-muted/60 mt-0.5">Operator Profile</p>
        </div>

        <div className="flex items-center gap-2">
          <StatPill label="Labs"   value={labsLabel} />
          <StatPill label="Streak" value={streakLabel} />
          <StatPill label="Flags"  value={flagsLabel} />
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded border border-border/60 text-[9px] font-semibold uppercase tracking-widest text-muted/80 hover:border-accent/40 hover:text-accent transition-colors duration-150 flex-shrink-0"
          aria-expanded={expanded}
          aria-label="Toggle full profile"
        >
          {expanded ? 'Collapse' : 'Full Profile'}
          <svg
            width="8" height="8" viewBox="0 0 8 8" fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Expanded full profile ── */}
      {expanded && (
        <div
          className="border-t border-border/50 px-4 py-4 flex gap-6 flex-wrap"
          style={{ background: 'color-mix(in srgb, var(--bg) 60%, var(--panel))' }}
        >
          {/* Skill Radar */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <p className="text-[9px] font-semibold text-muted uppercase tracking-widest self-start">
              Skill Map
            </p>
            <SkillRadar skills={skills} />
          </div>

          {/* Right column: streak + badges */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {/* Streak calendar */}
            <div>
              <p className="text-[9px] font-semibold text-muted uppercase tracking-widest mb-2">
                Activity
              </p>
              <StreakCalendar
                activityDates={activity}
                currentStreak={streak}
              />
            </div>

            {/* Badges */}
            <BadgeDisplay
              totalFlags={flags}
              totalLabsCompleted={labs}
              currentStreak={streak}
              totalCredentials={creds}
            />
          </div>
        </div>
      )}
    </div>
  )
}
