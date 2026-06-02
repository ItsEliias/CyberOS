import { useState, useMemo } from 'react'
import { useStore } from '../store'
import CredentialRow from './CredentialRow'
import CredentialModal from './CredentialModal'
import type { Credential } from '@shared/types'

type SortOrder = 'newest' | 'oldest' | null

const COL_HEADERS = ['Service', 'Username', 'IP / Port', 'Tags', 'Source', 'Date', 'Status', 'Age']

export default function VaultView() {
  const credentials    = useStore(s => s.credentials)
  const setCredentials = useStore(s => s.setCredentials)
  const setStats       = useStore(s => s.setStats)
  const searchQuery    = useStore(s => s.searchQuery)
  const filterTag      = useStore(s => s.filterTag)
  const filterStatus   = useStore(s => s.filterStatus)
  const filterSource   = useStore(s => s.filterSource)
  const setSearch      = useStore(s => s.setSearch)
  const setFilterTag   = useStore(s => s.setFilterTag)
  const setFilterStatus= useStore(s => s.setFilterStatus)
  const setFilterSource= useStore(s => s.setFilterSource)
  const resetFilters   = useStore(s => s.resetFilters)

  const [showModal, setShowModal] = useState(false)
  const [editCred, setEditCred]   = useState<Credential | null>(null)
  const [sortAge, setSortAge]     = useState<SortOrder>(null)

  // Collect all unique tags / sources for filter chips
  const allTags    = useMemo(() => [...new Set(credentials.flatMap(c => c.tags))].sort(), [credentials])
  const allSources = useMemo(() => [...new Set(credentials.map(c => c.source))].sort(), [credentials])
  const allStatuses: Credential['status'][] = ['active', 'rotated', 'invalid']

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const result = credentials.filter(c => {
      if (filterTag    && !c.tags.includes(filterTag))       return false
      if (filterStatus && c.status !== filterStatus)          return false
      if (filterSource && c.source !== filterSource)          return false
      if (!q) return true
      return [
        c.username, c.service, c.ip ?? '', c.targetName ?? '',
        c.labName ?? '', c.source, c.notes ?? '',
        ...(c.tags ?? [])
      ].some(f => f.toLowerCase().includes(q))
    })

    if (sortAge === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortAge === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    return result
  }, [credentials, searchQuery, filterTag, filterStatus, filterSource, sortAge])

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

  async function handleEdit(cred: Credential) {
    setEditCred(cred)
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

  const hasFilters = searchQuery || filterTag || filterStatus || filterSource

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexShrink: 0,
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search credentials…"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />

        {/* Filter chips row */}
        <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {allStatuses.map(s => (
            <FilterChip
              key={s}
              label={s}
              active={filterStatus === s}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
            />
          ))}
          {allSources.map(src => (
            <FilterChip
              key={src}
              label={src}
              active={filterSource === src}
              onClick={() => setFilterSource(filterSource === src ? null : src)}
            />
          ))}
          {allTags.slice(0, 8).map(t => (
            <FilterChip
              key={t}
              label={`#${t}`}
              active={filterTag === t}
              onClick={() => setFilterTag(filterTag === t ? null : t)}
            />
          ))}
          {hasFilters && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={resetFilters}
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort by age toggle */}
        <button
          className="btn btn-ghost"
          style={{
            fontSize: 11,
            padding: '2px 8px',
            border: sortAge ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: sortAge ? 'var(--accent-dim)' : 'transparent',
            color: sortAge ? 'var(--accent)' : 'var(--text-dim)',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onClick={() => setSortAge(s => s === 'newest' ? 'oldest' : s === 'oldest' ? null : 'newest')}
          title="Cycle: newest first → oldest first → off"
        >
          {sortAge === 'newest' ? 'Age ↑ newest' : sortAge === 'oldest' ? 'Age ↓ oldest' : 'Sort: age'}
        </button>

        <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>
          + Add Credential
        </button>
      </div>

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
                  <th key={h} style={{
                    padding: '8px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--bg)',
                    zIndex: 1
                  }}>
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
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <CredentialModal
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
      {editCred && (
        <CredentialModal
          initial={editCred}
          onSave={handleEditSave}
          onClose={() => setEditCred(null)}
        />
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        cursor: 'pointer',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        transition: 'all 0.15s'
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
      <div style={{ fontSize: 12 }}>Click "+ Add Credential" or import from ReconDesk</div>
    </div>
  )
}
