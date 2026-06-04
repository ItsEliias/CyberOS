// CyberOS Dashboard — Lab History Table (sortable)

import { useState, useMemo } from 'react'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { normalizeEvents } from '../../utils/eventParser'

interface LabEntry {
  name: string
  platform: string
  date: string
  flags: number
  skills: string[]
}

type SortKey = 'name' | 'platform' | 'date' | 'flags'

const PLATFORM_STYLE: Record<string, { bg: string; color: string }> = {
  HTB:    { bg: 'rgba(248,81,73,0.12)',  color: '#f85149' },
  THM:    { bg: 'rgba(63,185,80,0.12)',  color: '#3fb950' },
  CTF:    { bg: 'rgba(180,79,255,0.12)', color: '#b44fff' },
  Client: { bg: 'rgba(74,158,255,0.12)', color: '#4a9eff' },
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'HTB') {
    // Red hexagon
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L22 7V17L12 22L2 17V7Z"
          fill="rgba(248,81,73,0.18)"
          stroke="#f85149"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (platform === 'THM') {
    // Green shield
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L3 7V12C3 16.42 7.12 20.56 12 22C16.88 20.56 21 16.42 21 12V7L12 2Z"
          fill="rgba(63,185,80,0.18)"
          stroke="#3fb950"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (platform === 'CTF') {
    // Purple flag
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 3V21M4 3L20 8L4 13"
          stroke="#b44fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M4 3L20 8L4 13Z" fill="rgba(180,79,255,0.18)" />
      </svg>
    )
  }
  if (platform === 'Client') {
    // Blue briefcase
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="8" width="20" height="14" rx="2" fill="rgba(74,158,255,0.18)" stroke="#4a9eff" strokeWidth="1.5" />
        <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="2" y1="14" x2="22" y2="14" stroke="#4a9eff" strokeWidth="1" strokeOpacity="0.4" />
      </svg>
    )
  }
  return null
}

function PlatformBadge({ platform }: { platform: string }) {
  const style = PLATFORM_STYLE[platform] ?? { bg: 'rgba(42,51,71,0.4)', color: '#8b949e' }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}25` }}
    >
      <PlatformIcon platform={platform} />
      {platform}
    </span>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg
      width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      className="inline ml-1"
      style={{ color: active ? '#4a9eff' : 'rgba(139,148,158,0.5)' }}
    >
      {dir === 'asc'
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />}
    </svg>
  )
}

export default function LabHistoryTable() {
  const events = useDashboardStore((s) => s.events)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const labs = useMemo(() => {
    const normalized = normalizeEvents(events)
    return normalized
      .filter((e) => e.event === 'lab:completed' || e.event === 'session:ended')
      .map((e): LabEntry => ({
        name: (e.data.lab as string) ?? (e.data.name as string) ?? 'Unknown Lab',
        platform: (e.data.platform as string) ?? 'Unknown',
        date: e.timestamp.slice(0, 10),
        flags: (e.data.flags as number) ?? 0,
        skills: (e.data.skills as string[]) ?? [],
      }))
  }, [events])

  const sorted = useMemo(() => {
    const copy = [...labs]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'platform') cmp = a.platform.localeCompare(b.platform)
      else if (sortKey === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'flags') cmp = a.flags - b.flags
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [labs, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}
      >
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Lab History</span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(74,158,255,0.1)', color: 'var(--accent)' }}
        >
          {sorted.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 py-10 text-center flex-1">
          <p className="text-xs text-text-muted">No lab completions recorded yet</p>
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}>
                {([
                  { key: 'name', label: 'Lab Name' },
                  { key: 'platform', label: 'Platform' },
                  { key: 'date', label: 'Date' },
                  { key: 'flags', label: 'Flags' },
                ] as { key: SortKey; label: string }[]).map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-2 font-medium cursor-pointer select-none transition-colors hover:text-text-primary"
                    style={{ color: sortKey === col.key ? 'var(--accent)' : 'var(--text-muted)' }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-medium text-text-muted">Skills</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lab, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: '1px solid rgba(42,51,71,0.2)' }}
                >
                  <td className="px-4 py-2 text-text-primary font-medium">{lab.name}</td>
                  <td className="px-4 py-2"><PlatformBadge platform={lab.platform} /></td>
                  <td className="px-4 py-2 text-text-secondary font-mono">{lab.date}</td>
                  <td className="px-4 py-2 text-text-primary tabular-nums font-mono">{lab.flags}</td>
                  <td className="px-4 py-2 text-text-muted">{lab.skills.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
