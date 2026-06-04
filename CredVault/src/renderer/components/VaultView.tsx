import { useState, useMemo, useCallback } from 'react'
import { useStore, type SortOrder } from '../store'
import CredentialRow from './CredentialRow'
import CredentialModal from './CredentialModal'
import type { Credential, BreachCheckResult } from '@shared/types'
import { fuzzyMatch } from '../utils/fuzzySearch'
import { scorePassword } from '../utils/passwordStrength'

const COL_HEADERS = ['Service', 'Username', 'IP / Port', 'Tags', 'Source', 'Date', 'Status', 'Age']

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: null,        label: 'Default' },
  { value: 'lastUsed',  label: 'Last Used' },
  { value: 'alpha',     label: 'A → Z' },
  { value: 'newest',    label: 'Newest' },
  { value: 'strength',  label: 'Strength' },
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

  const hasFilters = searchQuery || filterTag || filterStatus || filterSource || filterCategory || (filterFolder && filterFolder !== '__notes__')

  async function refreshData() {
    const [creds, stats] = await Promise.all([
      window.electronAPI.getCredentials(),
      window.electronAPI.getStats()
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
    setBreachRunning(true)
    setBreachDone(false)
    const results: Record<string, BreachCheckResult> = {}
    for (const c of withPasswords) {
      try {
        const res = await window.electronAPI.checkBreach(c.id, c.password!)
        results[c.id] = res
      } catch {
        results[c.id] = { ok: false }
      }
    }
    const breached = Object.values(results).filter(r => r.ok && (r.breachCount ?? 0) > 0).length
    if (breached > 0) {
      import('../utils/audioNotify').then(m => m.playBreachDetected()).catch(() => {})
    }
    setBreachMap(results)
    setBreachRunning(false)
    setBreachDone(true)
  }, [credentials])

  const breachedCount = Object.values(breachMap).filter(r => r.ok && (r.breachCount ?? 0) > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Fuzzy search…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, paddingRight: 36 }}
          />
          {searchQuery && (
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>
              {filtered.length}
            </span>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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
            <FilterChip key={`folder:${f}`} label={`📁 ${f}`} active={filterFolder === f} onClick={() => setFilterFolder(filterFolder === f ? null : f)} />
          ))}
          {hasFilters && (
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={resetFilters}>
              Clear
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <select
          value={sortOrder ?? ''}
          onChange={e => setSortOrder((e.target.value || null) as SortOrder)}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text-dim)', cursor: 'pointer' }}
          title="Sort order"
        >
          {SORT_OPTIONS.map(o => (
            <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
          ))}
        </select>

        {/* HIBP breach check */}
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '3px 10px', color: breachedCount > 0 ? '#f85149' : 'var(--text-dim)' }}
          onClick={runBreachCheck}
          disabled={breachRunning}
          title="Check all passwords against HaveIBeenPwned"
        >
          {breachRunning ? 'Checking…' : breachDone ? `Breaches: ${breachedCount}` : 'HIBP Check'}
        </button>

        <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>
          + Add
        </button>
      </div>

      {/* Recently Used section */}
      {recentlyUsed.length > 0 && !searchQuery && !hasFilters && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Recent</span>
          {recentlyUsed.map(c => (
            <button
              key={c.id}
              onClick={() => setSearch(c.service)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', cursor: 'pointer',
              }}
              title={`${c.service} — ${c.username}`}
            >
              <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.service}</span>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {credentials.length === 0 ? (
          <Empty />
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No credentials match your search or filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {COL_HEADERS.map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <CredentialRow
                  key={c.id}
                  cred={c}
                  searchQuery={searchQuery}
                  breached={breachMap[c.id]?.ok && (breachMap[c.id].breachCount ?? 0) > 0}
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

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function Empty() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🗄️</div>
      <div style={{ fontSize: 14, marginBottom: 6 }}>No credentials yet</div>
      <div style={{ fontSize: 12 }}>Click "+ Add" or import from ReconDesk</div>
    </div>
  )
}
