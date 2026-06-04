import { useState, useMemo, useCallback, useEffect } from 'react'
import { useStore, type SortOrder } from '../store'
import CredentialRow from './CredentialRow'
import CredentialModal from './CredentialModal'
import type { Credential, BreachCheckResult } from '@shared/types'
import { fuzzyMatch } from '../utils/fuzzySearch'
import { scorePassword } from '../utils/passwordStrength'
import { COL_HEADERS, SkeletonRows, FilterChip, Empty, NoResults } from './VaultViewStates'

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  'Login':       '#38bdf8',   // blue
  'API Key':     '#a78bfa',   // purple
  'Certificate': '#3fb950',   // green
  'Note':        '#d29922',   // amber
  'SSH':         '#f78166',   // coral
  'Web':         '#4a9eff',
  'Database':    '#f85149',
  'Token':       '#e879f9',
  'Other':       '#8b949e',
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return <span style={{ color: '#484f58', fontSize: 11 }}>—</span>
  const color = CATEGORY_BADGE_COLORS[category] ?? '#8b949e'
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
      border: `1px solid ${color}40`, background: `${color}14`, color,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {category}
    </span>
  )
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: null,        label: 'Default'   },
  { value: 'lastUsed',  label: 'Last Used' },
  { value: 'alpha',     label: 'A → Z'     },
  { value: 'newest',    label: 'Newest'    },
  { value: 'strength',  label: 'Strength'  },
]

export default function VaultView() {
  const credentials    = useStore(s => s.credentials)
  const setCredentials = useStore(s => s.setCredentials)
  const setStats       = useStore(s => s.setStats)
  const searchQuery    = useStore(s => s.searchQuery)
  const filterTag      = useStore(s => s.filterTag)
  const filterStatus   = useStore(s => s.filterStatus)
  const filterSource   = useStore(s => s.filterSource)
  const filterCategory = useStore(s => s.filterCategory)
  const filterFolder   = useStore(s => s.filterFolder)
  const sortOrder      = useStore(s => s.sortOrder)
  const setSearch      = useStore(s => s.setSearch)
  const setFilterTag   = useStore(s => s.setFilterTag)
  const setFilterStatus= useStore(s => s.setFilterStatus)
  const setFilterSource= useStore(s => s.setFilterSource)
  const setFilterCategory = useStore(s => s.setFilterCategory)
  const setFilterFolder   = useStore(s => s.setFilterFolder)
  const setSortOrder   = useStore(s => s.setSortOrder)
  const resetFilters   = useStore(s => s.resetFilters)

  const [showModal, setShowModal] = useState(false)
  const [editCred, setEditCred]   = useState<Credential | null>(null)
  const [breachMap, setBreachMap] = useState<Record<string, BreachCheckResult>>({})
  const [breachRunning, setBreachRunning] = useState(false)
  const [breachDone, setBreachDone] = useState(false)
  // improvement #1: skeleton loader on initial mount
  const [initialLoading, setInitialLoading] = useState(true)
  useEffect(() => {
    if (credentials.length >= 0) {
      const t = setTimeout(() => setInitialLoading(false), 400)
      return () => clearTimeout(t)
    }
  }, [])

  const allTags       = useMemo(() => [...new Set(credentials.flatMap(c => c.tags))].sort(), [credentials])
  const allSources    = useMemo(() => [...new Set(credentials.map(c => c.source))].sort(), [credentials])
  const allFolders    = useMemo(() => [...new Set(credentials.map(c => c.folder).filter(Boolean) as string[])].sort(), [credentials])
  const allCategories = useMemo(() => [...new Set(credentials.map(c => c.category).filter(Boolean) as string[])].sort(), [credentials])
  const allStatuses: Credential['status'][] = ['active', 'rotated', 'invalid']

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const notesSentinel = filterFolder === '__notes__'
    let result = credentials.filter(c => {
      if (notesSentinel) return (c.type ?? 'credential') === 'note'
      if (filterTag      && !c.tags.includes(filterTag))       return false
      if (filterStatus   && c.status !== filterStatus)          return false
      if (filterSource   && c.source !== filterSource)          return false
      if (filterCategory && c.category !== filterCategory)      return false
      if (filterFolder   && c.folder !== filterFolder)          return false
      if (!q) return true
      const fields = [c.service, c.username, c.ip ?? '', c.targetName ?? '', c.labName ?? '', c.source, c.notes ?? '', ...(c.tags ?? [])]
      return fields.some(f => fuzzyMatch(q, f).matched)
    })
    if (sortOrder === 'lastUsed') {
      result = [...result].sort((a, b) => {
        const at = a.lastUsed ? new Date(a.lastUsed).getTime() : 0
        const bt = b.lastUsed ? new Date(b.lastUsed).getTime() : 0
        return bt - at
      })
    } else if (sortOrder === 'alpha') {
      result = [...result].sort((a, b) => a.service.localeCompare(b.service))
    } else if (sortOrder === 'newest') {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortOrder === 'strength') {
      result = [...result].sort((a, b) => {
        const sa = a.password ? scorePassword(a.password).score : 0
        const sb = b.password ? scorePassword(b.password).score : 0
        return sb - sa
      })
    }
    return result
  }, [credentials, searchQuery, filterTag, filterStatus, filterSource, filterCategory, filterFolder, sortOrder])

  const recentlyUsed = useMemo(() => {
    return credentials
      .filter(c => c.lastUsed)
      .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
      .slice(0, 5)
  }, [credentials])

  const recentlyAdded = useMemo(() => {
    return [...credentials]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
  }, [credentials])

  const hasFilters = searchQuery || filterTag || filterStatus || filterSource || filterCategory || (filterFolder && filterFolder !== '__notes__')

  async function refreshData() {
    const [creds, stats] = await Promise.all([
      window.electronAPI.getCredentials(),
      window.electronAPI.getStats(),
    ])
    setCredentials(creds)
    setStats(stats)
  }

  async function handleAdd(data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) {
    await window.electronAPI.addCredential(data)
    setShowModal(false)
    await refreshData()
  }

  async function handleEditSave(data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!editCred) return
    await window.electronAPI.updateCredential(editCred.id, data)
    setEditCred(null)
    await refreshData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this credential?')) return
    await window.electronAPI.deleteCredential(id)
    await refreshData()
  }

  async function handleRotate(id: string) {
    await window.electronAPI.updateCredential(id, { status: 'rotated' })
    await refreshData()
  }

  const runBreachCheck = useCallback(async () => {
    const withPasswords = credentials.filter(c => c.password)
    if (!withPasswords.length) return
    setBreachRunning(true); setBreachDone(false)
    const results: Record<string, BreachCheckResult> = {}
    for (const c of withPasswords) {
      try {
        const res = await window.electronAPI.checkBreach(c.id, c.password!)
        results[c.id] = res
      } catch { results[c.id] = { ok: false } }
    }
    const breached = Object.values(results).filter(r => r.ok && (r.breachCount ?? 0) > 0).length
    if (breached > 0) {
      import('../utils/audioNotify').then(m => m.playBreachDetected()).catch(() => {})
    }
    setBreachMap(results); setBreachRunning(false); setBreachDone(true)
  }, [credentials])

  const breachedCount = Object.values(breachMap).filter(r => r.ok && (r.breachCount ?? 0) > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center gap-2 flex-wrap px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.35)', background: 'rgba(7,8,15,0.6)' }}
      >
        {/* Search — improvement #5: focus glow ring */}
        <div className="search-input-wrap" style={{ position: 'relative' }}>
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#484f58', pointerEvents: 'none', zIndex: 1 }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Fuzzy search…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, paddingLeft: 30, paddingRight: searchQuery ? 36 : undefined }}
          />
          {searchQuery && (
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#484f58', pointerEvents: 'none' }}>
              {filtered.length}
            </span>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {allStatuses.map(s => (
            <FilterChip key={s} label={s} active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? null : s)} />
          ))}
          {allCategories.map(cat => (
            <FilterChip key={cat} label={cat} active={filterCategory === cat} onClick={() => setFilterCategory(filterCategory === cat ? null : cat)} />
          ))}
          {allSources.map(src => (
            <FilterChip key={src} label={src} active={filterSource === src} onClick={() => setFilterSource(filterSource === src ? null : src)} />
          ))}
          {allTags.slice(0, 6).map(t => (
            <FilterChip key={t} label={`#${t}`} active={filterTag === t} onClick={() => setFilterTag(filterTag === t ? null : t)} />
          ))}
          {allFolders.filter(f => f !== '__notes__').map(f => (
            <FilterChip key={`folder:${f}`} label={`${f}`} active={filterFolder === f} onClick={() => setFilterFolder(filterFolder === f ? null : f)} />
          ))}
          {hasFilters && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '2px 8px', color: '#f78166', borderColor: 'rgba(247,129,102,0.3)' }}
              onClick={resetFilters}
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortOrder ?? ''}
          onChange={e => setSortOrder((e.target.value || null) as SortOrder)}
          style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(42,51,71,0.6)', background: 'rgba(13,14,24,0.9)', color: '#8b949e', cursor: 'pointer' }}
          title="Sort order"
        >
          {SORT_OPTIONS.map(o => (
            <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
          ))}
        </select>

        {/* HIBP check — improvement #9: spinner + animated result */}
        <button
          className="btn btn-ghost"
          style={{
            fontSize: 11, padding: '3px 10px',
            color: breachedCount > 0 ? '#f85149' : breachDone ? '#3fb950' : '#8b949e',
            borderColor: breachedCount > 0 ? 'rgba(248,81,73,0.4)' : breachDone ? 'rgba(63,185,80,0.35)' : undefined,
            minWidth: 90, justifyContent: 'center',
          }}
          onClick={runBreachCheck}
          disabled={breachRunning}
          title="Check all passwords against HaveIBeenPwned"
        >
          {breachRunning
            ? <><span className="hibp-spinner" />Scanning…</>
            : breachDone
              ? breachedCount > 0
                ? `⚠ ${breachedCount} breach${breachedCount !== 1 ? 'es' : ''}`
                : '✓ Clean'
              : 'HIBP Check'}
        </button>

        <button
          className="btn btn-accent"
          style={{ fontSize: 12, background: '#f78166', color: '#07080f', border: 'none', fontWeight: 600 }}
          onClick={() => setShowModal(true)}
        >
          + Add
        </button>
      </div>

      {/* Recently Added */}
      {recentlyAdded.length > 0 && !searchQuery && !hasFilters && (
        <div
          className="shrink-0 px-4 py-2"
          style={{ borderBottom: '1px solid rgba(42,51,71,0.25)', background: 'rgba(7,8,15,0.4)' }}
        >
          <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Recently Added</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recentlyAdded.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid rgba(247,129,102,0.15)', background: 'rgba(247,129,102,0.04)',
                }}
              >
                <span style={{ fontSize: 11, color: '#c9d1d9', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.service}</span>
                <span style={{ fontSize: 10, color: '#484f58' }}>·</span>
                <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>{c.username}</span>
                <span style={{ fontSize: 9, color: '#f78166', marginLeft: 2 }}>new</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Used */}
      {recentlyUsed.length > 0 && !searchQuery && !hasFilters && (
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-1.5 flex-wrap"
          style={{ borderBottom: '1px solid rgba(42,51,71,0.25)', background: 'rgba(7,8,15,0.4)' }}
        >
          <span style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 2 }}>Recent</span>
          {recentlyUsed.map(c => (
            <button
              key={c.id}
              onClick={() => setSearch(c.service)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                border: '1px solid rgba(42,51,71,0.5)', background: 'transparent',
                color: '#8b949e', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
              }}
              title={`${c.service} — ${c.username}`}
            >
              <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.service}</span>
            </button>
          ))}
        </div>
      )}

      {/* Table — improvements #1 (skeleton), #8 (sticky gradient header) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {initialLoading ? (
          <SkeletonRows />
        ) : credentials.length === 0 ? (
          <Empty />
        ) : filtered.length === 0 ? (
          <NoResults />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {COL_HEADERS.map(col => {
                  const isActive = col.sortKey && sortOrder === col.sortKey
                  return (
                    <th key={col.label} className={`table-sticky-head${col.sortKey ? ' sortable-th' : ''}`} style={{
                      padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                      color: isActive ? '#f78166' : '#484f58',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {col.label}
                      {col.sortKey && (
                        <span className="sort-arrow" style={{ color: isActive ? '#f78166' : undefined }}>
                          {isActive ? '▲' : '⬍'}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <CredentialRow
                  key={c.id}
                  cred={c}
                  searchQuery={searchQuery}
                  breached={breachMap[c.id]?.ok && (breachMap[c.id].breachCount ?? 0) > 0}
                  staggerIndex={idx}
                  onEdit={setEditCred}
                  onDelete={handleDelete}
                  onRotate={handleRotate}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <CredentialModal onSave={handleAdd} onClose={() => setShowModal(false)} />}
      {editCred  && <CredentialModal initial={editCred} onSave={handleEditSave} onClose={() => setEditCred(null)} />}
    </div>
  )
}

// SkeletonRows, FilterChip, Empty, NoResults imported from VaultViewStates.tsx
