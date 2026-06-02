import { useStore } from '../store'
import type { Playbook, PlaybookCategory } from '@shared/types'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all',              label: 'All' },
  { id: 'web-app',          label: 'Web App' },
  { id: 'network',          label: 'Network' },
  { id: 'active-directory', label: 'Active Directory' },
  { id: 'linux',            label: 'Linux' },
  { id: 'windows',          label: 'Windows' },
  { id: 'ctf',              label: 'CTF' },
  { id: 'custom',           label: 'Custom' },
]

const CAT_COLORS: Record<PlaybookCategory, string> = {
  'web-app':          '#e3b341',
  'network':          '#58a6ff',
  'active-directory': '#bc8cff',
  'linux':            '#3fb950',
  'windows':          '#79c0ff',
  'ctf':              '#ff7b72',
  'custom':           '#8b949e',
}

function PlaybookCard({ pb }: { pb: Playbook }) {
  const setView          = useStore(s => s.setView)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setRuns           = useStore(s => s.setRuns)
  const setActiveRun      = useStore(s => s.setActiveRun)
  const setPlaybooks      = useStore(s => s.setPlaybooks)

  async function handleRun() {
    const res = await window.electronAPI.startRun(pb.id)
    if (res.ok && res.run) {
      const allRuns = await window.electronAPI.getAllRuns()
      setRuns(allRuns)
      setActiveRun(res.run)
      setView('run')
    }
  }

  async function handleEdit() {
    setActivePlaybook(pb)
    setView('editor')
  }

  async function handleClone() {
    const res = await window.electronAPI.clonePlaybook(pb.id)
    if (res.ok && res.playbook) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${pb.name}"? This cannot be undone.`)) return
    const res = await window.electronAPI.deletePlaybook(pb.id)
    if (res.ok) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
    }
  }

  const catColor = CAT_COLORS[pb.category] ?? 'var(--text-muted)'

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2 transition-colors"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ background: `${catColor}22`, color: catColor }}
            >
              {pb.category}
            </span>
            {pb.isBuiltIn && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                built-in
              </span>
            )}
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{pb.name}</div>
          <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-dim)' }}>{pb.description}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {pb.steps.length} steps
          {lastRun ? ` · last run ${lastRun}` : ''}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRun}
            className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Run
          </button>
          <button
            onClick={handleClone}
            className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors"
            style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
          >
            Clone
          </button>
          {!pb.isBuiltIn && (
            <>
              <button
                onClick={handleEdit}
                className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors"
                style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors"
                style={{ background: 'rgba(248,81,73,0.15)', color: 'var(--error)' }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LibraryView() {
  const playbooks       = useStore(s => s.playbooks)
  const categoryFilter  = useStore(s => s.categoryFilter)
  const setCategoryFilter = useStore(s => s.setCategoryFilter)
  const setView          = useStore(s => s.setView)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setPlaybooks      = useStore(s => s.setPlaybooks)

  const filtered = categoryFilter === 'all'
    ? playbooks
    : playbooks.filter(p => p.category === categoryFilter)

  async function handleNew() {
    const now = new Date().toISOString()
    const newPb = {
      id: `custom-${Date.now()}`,
      name: 'New Playbook',
      description: '',
      category: 'custom' as const,
      tags: [],
      version: '1.0',
      createdAt: now,
      updatedAt: now,
      steps: [],
      isBuiltIn: false,
    }
    setActivePlaybook(newPb)
    setView('editor')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Category filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-drag flex-1 min-w-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors"
              style={{
                background:  categoryFilter === cat.id ? 'var(--accent)' : 'var(--panel)',
                color:       categoryFilter === cat.id ? '#fff' : 'var(--text-dim)',
                border:      `1px solid ${categoryFilter === cat.id ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleNew}
          className="no-drag flex-shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + New Playbook
        </button>
      </div>

      {/* Playbook grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No playbooks in this category.
            </span>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map(pb => <PlaybookCard key={pb.id} pb={pb} />)}
          </div>
        )}
      </div>
    </div>
  )
}
