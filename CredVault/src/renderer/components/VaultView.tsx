import { useState, useMemo, useCallback, useEffect } from 'react'
import { useStore, type SortOrder } from '../store'
import CredentialModal from './CredentialModal'
import type { Credential, BreachCheckResult } from '@shared/types'
import { fuzzyMatch } from '../utils/fuzzySearch'
import { scorePassword } from '../utils/passwordStrength'
import { FilterChip, Empty, NoResults } from './VaultViewStates'
import CredentialDetailPanel from './CredentialDetailPanel'
import VaultDashboard from './VaultDashboard'
import PasswordGeneratorModal from './PasswordGeneratorModal'

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: null,        label: 'Default'   },
  { value: 'lastUsed',  label: 'Last Used' },
  { value: 'alpha',     label: 'A → Z'     },
  { value: 'newest',    label: 'Newest'    },
  { value: 'strength',  label: 'Strength'  },
]

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  'Login':       '#38bdf8',
  'API Key':     '#a78bfa',
  'Certificate': '#3fb950',
  'Note':        '#d29922',
  'SSH':         '#f78166',
  'Web':         '#4a9eff',
  'Database':    '#f85149',
  'Token':       '#e879f9',
  'Other':       '#8b949e',
}

function CategoryChip({ category }: { category?: string }) {
  if (!category) return null
  const color = CATEGORY_BADGE_COLORS[category] ?? '#8b949e'
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 6,
      border: `1px solid ${color}40`, background: `${color}14`, color,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {category}
    </span>
  )
}

const SCOPE_TABS = ['All', 'Logins', 'Cards', 'Notes'] as const
type ScopeTab = typeof SCOPE_TABS[number]

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
  const setSortOrder   = useStore(s => s.setSortOrder)
  const resetFilters   = useStore(s => s.resetFilters)

  const [showModal, setShowModal]   = useState(false)
  const [editCred, setEditCred]     = useState<Credential | null>(null)
  const [selected, setSelected]     = useState<Credential | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [seedPassword, setSeedPassword]   = useState<string | null>(null)
  const [scopeTab, setScopeTab]     = useState<ScopeTab>('All')
  const [breachMap, setBreachMap]   = useState<Record<string, BreachCheckResult>>({})
  const [breachRunning, setBreachRunning] = useState(false)
  const [breachDone, setBreachDone] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const allTags     = useMemo(() => [...new Set(credentials.flatMap(c => c.tags))].sort(), [credentials])
  const allSources  = useMemo(() => [...new Set(credentials.map(c => c.source))].sort(), [credentials])
  const hasFilters  = searchQuery || filterTag || filterStatus || filterSource || filterCategory || (filterFolder && filterFolder !== '__notes__')

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const notesSentinel = filterFolder === '__notes__'
    let result = credentials.filter(c => {
      if (notesSentinel) return (c.type ?? 'credential') === 'note'
      if (scopeTab === 'Logins' && c.category !== 'SSH' && c.category !== 'Web' && c.type !== 'credential') return false
      if (scopeTab === 'Cards'  && c.category !== 'API Key' && c.category !== 'Token') return false
      if (scopeTab === 'Notes'  && c.type !== 'note') return false
      if (filterTag      && !c.tags.includes(filterTag))       return false
      if (filterStatus   && c.status !== filterStatus)          return false
      if (filterSource   && c.source !== filterSource)          return false
      if (filterCategory && c.category !== filterCategory)      return false
      if (!q) return true
      const fields = [c.service, c.username, c.ip ?? '', c.notes ?? '', c.source, ...(c.tags ?? [])]
      return fields.some(f => fuzzyMatch(q, f).matched)
    })
    if (sortOrder === 'lastUsed') result = [...result].sort((a, b) => (b.lastUsed ? new Date(b.lastUsed).getTime() : 0) - (a.lastUsed ? new Date(a.lastUsed).getTime() : 0))
    else if (sortOrder === 'alpha')   result = [...result].sort((a, b) => a.service.localeCompare(b.service))
    else if (sortOrder === 'newest')  result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else if (sortOrder === 'strength') result = [...result].sort((a, b) => (b.password ? scorePassword(b.password).score : 0) - (a.password ? scorePassword(a.password).score : 0))
    return result
  }, [credentials, searchQuery, filterTag, filterStatus, filterSource, filterCategory, filterFolder, sortOrder, scopeTab])

  async function refreshData() {
    const [creds, stats] = await Promise.all([window.electronAPI.getCredentials(), window.electronAPI.getStats()])
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
    if (selected?.id === id) setSelected(null)
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
      try { results[c.id] = await window.electronAPI.checkBreach(c.id, c.password!) }
      catch { results[c.id] = { ok: false } }
    }
    const breached = Object.values(results).filter(r => r.ok && (r.breachCount ?? 0) > 0).length
    if (breached > 0) import('../utils/audioNotify').then(m => m.playBreachDetected()).catch(() => {})
    setBreachMap(results); setBreachRunning(false); setBreachDone(true)
  }, [credentials])

  const breachedCount = Object.values(breachMap).filter(r => r.ok && (r.breachCount ?? 0) > 0).length

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left panel (260px): search + list ───────────────────────────── */}
      <div style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(42,51,71,0.35)',
        background: 'rgba(10,10,15,0.7)',
        overflow: 'hidden',
      }}>

        {/* Search bar */}
        <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid rgba(42,51,71,0.25)' }}>
          <div className="search-input-wrap" style={{ position: 'relative' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#4a5568', pointerEvents: 'none', zIndex: 1 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Fuzzy search…"
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 28, paddingRight: searchQuery ? 32 : undefined, fontSize: 12 }}
            />
            {searchQuery && (
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#4a5568' }}>
                {filtered.length}
              </span>
            )}
          </div>
        </div>

        {/* Scope tabs (pill) */}
        <div style={{ display: 'flex', gap: 2, padding: '6px 10px', borderBottom: '1px solid rgba(42,51,71,0.25)' }}>
          {SCOPE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setScopeTab(tab)}
              style={{
                flex: 1, fontSize: 10, padding: '3px 0', borderRadius: 20,
                border: 'none', cursor: 'pointer',
                background: scopeTab === tab ? 'var(--app-accent, #f78166)' : 'transparent',
                color: scopeTab === tab ? '#0a0a0f' : '#8b949e',
                fontWeight: scopeTab === tab ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter row */}
        {(allTags.length > 0 || allSources.length > 0) && (
          <div style={{ padding: '4px 10px 4px', display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(42,51,71,0.2)' }}>
            {allSources.slice(0, 3).map(src => (
              <FilterChip key={src} label={src} active={filterSource === src} onClick={() => setFilterSource(filterSource === src ? null : src)} />
            ))}
            {allTags.slice(0, 4).map(t => (
              <FilterChip key={t} label={`#${t}`} active={filterTag === t} onClick={() => setFilterTag(filterTag === t ? null : t)} />
            ))}
            {hasFilters && (
              <button onClick={resetFilters} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(247,129,102,0.3)', background: 'transparent', color: '#f78166', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Sort + HIBP + Add row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderBottom: '1px solid rgba(42,51,71,0.25)' }}>
          <select
            value={sortOrder ?? ''}
            onChange={e => setSortOrder((e.target.value || null) as SortOrder)}
            style={{ flex: 1, fontSize: 10, padding: '3px 6px', borderRadius: 5, border: '1px solid rgba(42,51,71,0.6)', background: 'rgba(13,14,24,0.9)', color: '#8b949e', cursor: 'pointer' }}
          >
            {SORT_OPTIONS.map(o => <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>)}
          </select>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 10, padding: '2px 6px', color: breachedCount > 0 ? '#f85149' : breachDone ? '#3fb950' : '#8b949e', minWidth: 52, justifyContent: 'center' }}
            onClick={runBreachCheck}
            disabled={breachRunning}
            title="HIBP breach check"
          >
            {breachRunning ? <span className="hibp-spinner" /> : breachDone && breachedCount > 0 ? `⚠ ${breachedCount}` : 'HIBP'}
          </button>
          <button
            className="btn btn-accent"
            style={{ fontSize: 11, padding: '3px 10px', fontWeight: 600 }}
            onClick={() => setShowModal(true)}
          >
            + Add
          </button>
        </div>

        {/* Credential list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {initialLoading ? (
            <div style={{ padding: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 4 }} />
                  <div className="skeleton" style={{ height: 10, width: '45%' }} />
                </div>
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <Empty />
          ) : filtered.length === 0 ? (
            <NoResults />
          ) : (
            filtered.map(c => {
              const isActive = selected?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(isActive ? null : c)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 12px',
                    background: isActive ? 'rgba(247,129,102,0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--app-accent, #f78166)' : '2px solid transparent',
                    border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid rgba(42,51,71,0.2)',
                    transition: 'background 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 3,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(247,129,102,0.04)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.service}
                    </span>
                    {breachMap[c.id]?.ok && (breachMap[c.id].breachCount ?? 0) > 0 && (
                      <span title="Breached" style={{ fontSize: 9, color: '#f85149' }}>⚠</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11, color: '#8b949e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                      {c.username}
                    </span>
                    <CategoryChip category={c.category} />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel (flex-1): detail card or dashboard ──────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {selected ? (
          <div style={{ padding: 16 }}>
            <CredentialDetailPanel
              cred={selected}
              breachResult={breachMap[selected.id]}
              onEdit={c => setEditCred(c)}
              onDelete={handleDelete}
              onRotate={handleRotate}
            />
          </div>
        ) : (
          <VaultDashboard
            onAddClick={() => setShowModal(true)}
            onGenerateClick={() => setShowGenerator(true)}
            onImportClick={() => useStore.getState().setView('import')}
            onHibpClick={runBreachCheck}
            hibpRunning={breachRunning}
            breachedCount={breachedCount}
            onSelectCred={c => setSelected(c)}
          />
        )}
      </div>

      {showModal && (
        <CredentialModal
          initial={seedPassword ? { password: seedPassword } : undefined}
          onSave={async (data) => { await handleAdd(data); setSeedPassword(null) }}
          onClose={() => { setShowModal(false); setSeedPassword(null) }}
        />
      )}
      {editCred  && <CredentialModal initial={editCred} onSave={handleEditSave} onClose={() => setEditCred(null)} />}
      {showGenerator && (
        <PasswordGeneratorModal
          onClose={() => setShowGenerator(false)}
          onUse={(pw) => {
            setSeedPassword(pw)
            setShowGenerator(false)
            setShowModal(true)
          }}
        />
      )}
    </div>
  )
}
