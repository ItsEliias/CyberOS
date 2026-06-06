// NetLab — ProgressView.tsx

import { useNetLabStore } from '../store'
import type { LabCategory } from '@shared/types'
import HelpTip from './ui/HelpTip'

const CATEGORIES: LabCategory[] = ['CCNA', 'CCNP', 'Linux', 'FortiGate', 'EVE-NG', 'GNS3']

const SKILL_TOPICS = ['OSPF', 'EIGRP', 'VLANs', 'ACL', 'NAT', 'BGP'] as const
const SKILL_TAGS: Record<typeof SKILL_TOPICS[number], string[]> = {
  OSPF:  ['ospf'],
  EIGRP: ['eigrp'],
  VLANs: ['vlan', 'switching', 'trunk', 'vtp'],
  ACL:   ['acl', 'access-list'],
  NAT:   ['nat', 'pat'],
  BGP:   ['bgp'],
}

function formatMs(ms?: number): string {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s % 60}s`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Hexagon skill radar SVG
function SkillRadar({ skills }: { skills: Record<string, number> }) {
  const topics = SKILL_TOPICS
  const size   = 160
  const center = size / 2
  const maxR   = 60
  const n      = topics.length

  function toXY(i: number, r: number): [number, number] {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }

  const hexPoints = topics.map((_, i) => toXY(i, maxR).join(',')).join(' ')
  const skillPoints = topics.map((t, i) => toXY(i, maxR * (skills[t] ?? 0)).join(',')).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(frac => {
        const pts = topics.map((_, i) => toXY(i, maxR * frac).join(',')).join(' ')
        return <polygon key={frac} points={pts} fill="none" stroke="#2a3347" strokeWidth={1} />
      })}
      {/* Axes */}
      {topics.map((_, i) => {
        const [x, y] = toXY(i, maxR)
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#2a3347" strokeWidth={1} />
      })}
      {/* Skill fill */}
      <polygon points={skillPoints} fill="rgba(94,196,255,0.15)" stroke="#5ec4ff" strokeWidth={1.5} />
      {/* Labels */}
      {topics.map((t, i) => {
        const [x, y] = toXY(i, maxR + 14)
        return (
          <text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="#8b949e" fontSize={9} fontFamily="JetBrains Mono">
            {t}
          </text>
        )
      })}
    </svg>
  )
}

function CategoryBar({ category, completed, total }: { category: string; completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-secondary font-medium">{category}</span>
        <span className="text-text-muted">{completed}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct === 100 ? '#3fb950' : '#5ec4ff' }}
        />
      </div>
    </div>
  )
}

export default function ProgressView() {
  const labs     = useNetLabStore(s => s.labs)
  const progress = useNetLabStore(s => s.progress)

  // Per category stats
  const catStats = CATEGORIES.map(cat => {
    const catLabs = labs.filter(l => l.category === cat)
    const done = catLabs.filter(l => progress[l.id]?.completedAt).length
    return { category: cat, completed: done, total: catLabs.length }
  }).filter(c => c.total > 0)

  // Skill radar — what % of labs tagged with each topic are complete
  const skills: Record<string, number> = {}
  for (const topic of SKILL_TOPICS) {
    const tags = SKILL_TAGS[topic]
    const tagged = labs.filter(l => l.tags.some(t => tags.includes(t)))
    const done = tagged.filter(l => progress[l.id]?.completedAt).length
    skills[topic] = tagged.length === 0 ? 0 : done / tagged.length
  }

  // History table
  const history = Object.values(progress)
    .filter(p => p.completedAt)
    .map(p => {
      const lab = labs.find(l => l.id === p.labId)
      return { lab, progress: p }
    })
    .filter(h => h.lab)
    .sort((a, b) => new Date(b.progress.completedAt!).getTime() - new Date(a.progress.completedAt!).getTime())

  const totalLabs = labs.length
  const doneLabs  = Object.values(progress).filter(p => p.completedAt).length
  const streakDays = Math.min(doneLabs, 7) // simplified streak

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Labs Completed', value: `${doneLabs}/${totalLabs}`, color: '#5ec4ff' },
            { label: 'Completion Rate', value: totalLabs ? `${Math.round((doneLabs/totalLabs)*100)}%` : '0%', color: '#3fb950' },
            { label: 'Current Streak', value: `${streakDays} days`, color: '#d29922' },
          ].map(card => (
            <div key={card.label} className="p-4 rounded border border-border-subtle" style={{ background: '#0f1117' }}>
              <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">{card.label}</p>
              <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Category progress */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Category Progress
              </h3>
              <HelpTip
                title="Category Progress"
                body="Completion ratio per vendor track (CCNA, CCNP, FortiGate, etc.). Hit 100% to clear a category."
              />
            </div>
            {catStats.length === 0 ? (
              <p className="text-sm text-text-muted">No labs loaded yet.</p>
            ) : (
              catStats.map(c => (
                <CategoryBar key={c.category} {...c} />
              ))
            )}
          </div>

          {/* Skill radar */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Skill Radar
            </h3>
            <div className="flex items-center justify-center">
              <SkillRadar skills={skills} />
            </div>
          </div>
        </div>

        {/* Lab history */}
        <div>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Completed Labs
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-text-muted">No labs completed yet. Start a lab to track progress!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left">
                    <th className="pb-2 text-xs text-text-muted font-medium">Lab</th>
                    <th className="pb-2 text-xs text-text-muted font-medium">Category</th>
                    <th className="pb-2 text-xs text-text-muted font-medium">Completed</th>
                    <th className="pb-2 text-xs text-text-muted font-medium">Best Time</th>
                    <th className="pb-2 text-xs text-text-muted font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(({ lab, progress: p }) => (
                    <tr key={p.labId} className="border-b border-border-subtle last:border-0">
                      <td className="py-2.5 pr-4 text-text-primary font-medium">{lab!.title}</td>
                      <td className="py-2.5 pr-4">
                        <span className="text-2xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(94,196,255,0.1)', color: '#5ec4ff' }}>
                          {lab!.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-text-secondary">{formatDate(p.completedAt)}</td>
                      <td className="py-2.5 pr-4 font-mono-code text-text-secondary">{formatMs(p.bestTimeMs)}</td>
                      <td className="py-2.5">
                        {p.rating ? (
                          <span style={{ color: '#d29922' }}>{'★'.repeat(p.rating)}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
