// CyberOS Dashboard — Lab History Table
// Sortable table of completed labs with platform badges

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

export default function LabHistoryTable() {
  const events = useDashboardStore((s) => s.events)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Extract lab completions from events
  const labs = useMemo(() => {
    const normalized = normalizeEvents(events)
    const labEvents = normalized.filter(
      (e) => e.event === 'lab:completed' || e.event === 'session:ended'
    )

    return labEvents.map((e): LabEntry => ({
      name: (e.data.lab as string) ?? (e.data.name as string) ?? 'Unknown Lab',
      platform: (e.data.platform as string) ?? 'Unknown',
      date: e.timestamp.slice(0, 10),
      flags: (e.data.flags as number) ?? 0,
      skills: (e.data.skills as string[]) ?? [],
    }))
  }, [events])

  // Sort
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
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const platformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      HTB: 'bg-danger/20 text-danger',
      THM: 'bg-success/20 text-success',
      CTF: 'bg-[#b44fff]/20 text-[#b44fff]',
      Client: 'bg-accent/20 text-accent',
    }
    const cls = colors[platform] ?? 'bg-bg-interactive text-text-secondary'
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
        {platform}
      </span>
    )
  }

  const SortIcon = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className={`inline ml-1 ${active ? 'text-accent' : 'text-text-muted'}`}
    >
      {dir === 'asc' ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  )

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Lab History
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-text-muted">No lab completions recorded yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th
                  className="text-left px-4 py-2 text-text-secondary font-medium cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('name')}
                >
                  Lab Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-2 text-text-secondary font-medium cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('platform')}
                >
                  Platform <SortIcon active={sortKey === 'platform'} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-2 text-text-secondary font-medium cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('date')}
                >
                  Date <SortIcon active={sortKey === 'date'} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-2 text-text-secondary font-medium cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('flags')}
                >
                  Flags <SortIcon active={sortKey === 'flags'} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Skills</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lab, i) => (
                <tr key={i} className="border-b border-border-subtle/50 hover:bg-bg-interactive/30">
                  <td className="px-4 py-2 text-text-primary font-medium">{lab.name}</td>
                  <td className="px-4 py-2">{platformBadge(lab.platform)}</td>
                  <td className="px-4 py-2 text-text-secondary font-mono">{lab.date}</td>
                  <td className="px-4 py-2 text-text-primary tabular-nums">{lab.flags}</td>
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
