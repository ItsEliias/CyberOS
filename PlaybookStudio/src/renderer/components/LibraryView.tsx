import { useState } from 'react'
import { useStore } from '../store'
import type { Playbook } from '@shared/types'
import { VAPT_METHODOLOGIES, buildVaptPlaybook, type VaptMethodology } from './library/vapt-data'
import PlaybookCard from './library/PlaybookCard'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all',              label: 'All' },
  { id: 'templates',        label: 'Templates' },
  { id: 'web-app',          label: 'Web App' },
  { id: 'network',          label: 'Network' },
  { id: 'active-directory', label: 'Active Directory' },
  { id: 'linux',            label: 'Linux' },
  { id: 'windows',          label: 'Windows' },
  { id: 'cloud',            label: 'Cloud' },
  { id: 'social-eng',       label: 'Social Eng' },
  { id: 'ctf',              label: 'CTF' },
  { id: 'ccna',             label: 'CCNA' },
  { id: 'custom',           label: 'Custom' },
]

// ─── Import preview modal ─────────────────────────────────────────────────────

function ImportPreviewModal({
  playbook, onConfirm, onCancel,
}: {
  playbook: Partial<Playbook>
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div
        className="rounded-xl p-5 flex flex-col gap-4"
        style={{
          width: 400,
          background: '#0d0e18',
          border: '1px solid rgba(42,51,71,0.75)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Import Playbook</h2>
          <p className="text-xs mt-0.5" style={{ color: '#484f58' }}>Review before importing</p>
        </div>
        <div
          className="rounded-lg p-3 flex flex-col gap-2"
          style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)' }}
        >
          <div className="text-xs font-medium" style={{ color: '#e6edf3' }}>{playbook.name ?? 'Untitled'}</div>
          {playbook.description && (
            <div className="text-xs" style={{ color: '#8b949e' }}>{playbook.description}</div>
          )}
          <div className="text-xs font-mono" style={{ color: '#2dd4bf' }}>
            {playbook.steps?.length ?? 0} steps · {playbook.category}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 text-xs py-2 rounded"
            style={{ background: 'rgba(42,51,71,0.4)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-xs py-2 rounded font-semibold"
            style={{ background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.30)' }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── LibraryView ──────────────────────────────────────────────────────────────

export default function LibraryView() {
  const playbooks         = useStore(s => s.playbooks)
  const categoryFilter    = useStore(s => s.categoryFilter)
  const setCategoryFilter = useStore(s => s.setCategoryFilter)
  const setView           = useStore(s => s.setView)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setPlaybooks      = useStore(s => s.setPlaybooks)

  const [importPreview, setImportPreview] = useState<Partial<Playbook> | null>(null)
  const [importStatus,  setImportStatus]  = useState<string | null>(null)
  const [showVapt,      setShowVapt]      = useState(false)
  const [mitreFilter,   setMitreFilter]   = useState('')
  const [searchTerm,    setSearchTerm]    = useState('')

  const filtered = (() => {
    let list = playbooks
    if (categoryFilter === 'templates') list = playbooks.filter(p => p.isBuiltIn)
    else if (categoryFilter === 'custom') list = playbooks.filter(p => !p.isBuiltIn)
    else if (categoryFilter !== 'all') list = playbooks.filter(p => p.category === categoryFilter)
    if (mitreFilter.trim()) {
      const q = mitreFilter.trim().toUpperCase()
      list = list.filter(p => p.steps.some(s =>
        s.mitreTechniqueId?.toUpperCase().includes(q) || s.mitreTechniqueName?.toUpperCase().includes(q)
      ))
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    return list
  })()

  function handleNew() {
    const now = new Date().toISOString()
    setActivePlaybook({
      id: `custom-${Date.now()}`,
      name: 'New Playbook', description: '', category: 'custom',
      tags: [], version: '1.0', createdAt: now, updatedAt: now,
      steps: [], isBuiltIn: false,
    })
    setView('editor')
  }

  async function handleImportFile() {
    const res = await window.electronAPI.importFile()
    if (!res.ok || !res.content) { setImportStatus(res.error ?? 'Import cancelled'); return }
    try {
      let parsed: Partial<Playbook>
      if (res.ext === '.yaml' || res.ext === '.yml') {
        const yaml = await import('js-yaml')
        parsed = yaml.load(res.content) as Partial<Playbook>
      } else {
        parsed = JSON.parse(res.content) as Partial<Playbook>
      }
      const candidate = Array.isArray(parsed) ? (parsed as Partial<Playbook>[])[0] : parsed
      if (!candidate?.name) throw new Error('Invalid playbook format')
      setImportPreview({ ...candidate, isBuiltIn: false })
    } catch (e) {
      setImportStatus('Parse failed: ' + (e as Error).message)
      setTimeout(() => setImportStatus(null), 4000)
    }
  }

  async function confirmImport() {
    if (!importPreview) return
    const now = new Date().toISOString()
    const pb: Playbook = {
      id: importPreview.id ?? `custom-${Date.now()}`,
      name: importPreview.name ?? 'Imported Playbook',
      description: importPreview.description ?? '',
      category: importPreview.category ?? 'custom',
      tags: importPreview.tags ?? [],
      version: importPreview.version ?? '1.0',
      createdAt: importPreview.createdAt ?? now,
      updatedAt: now,
      steps: importPreview.steps ?? [],
      isBuiltIn: false,
    }
    const res = await window.electronAPI.savePlaybook(pb)
    if (res.ok) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
      setImportStatus('Imported: ' + pb.name)
      setTimeout(() => setImportStatus(null), 3000)
    }
    setImportPreview(null)
  }

  async function importVapt(methodology: VaptMethodology) {
    const draft = buildVaptPlaybook(methodology)
    const now = new Date().toISOString()
    const pb: Playbook = {
      ...draft,
      id: `custom-vapt-${methodology.id}-${Date.now()}`,
      createdAt: now, updatedAt: now,
    }
    const res = await window.electronAPI.savePlaybook(pb)
    if (res.ok) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
      setImportStatus(`Imported: ${pb.name}`)
      setTimeout(() => setImportStatus(null), 3000)
    }
    setShowVapt(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 gap-3"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.5)', background: 'rgba(13,14,24,0.6)' }}
      >
        {/* Category filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-drag flex-1 min-w-0">
          {CATEGORIES.map(cat => {
            const isActive = categoryFilter === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-all"
                style={{
                  background: isActive ? 'rgba(45,212,191,0.12)' : 'rgba(42,51,71,0.2)',
                  color:      isActive ? '#2dd4bf' : '#484f58',
                  border:     `1px solid ${isActive ? 'rgba(45,212,191,0.28)' : 'rgba(42,51,71,0.4)'}`,
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search playbooks…"
            className="no-drag text-xs rounded px-2.5 py-1.5 w-36"
            style={{
              background: '#07080f',
              border: '1px solid rgba(42,51,71,0.6)',
              color: '#e6edf3',
            }}
          />
          <input
            value={mitreFilter}
            onChange={e => setMitreFilter(e.target.value)}
            placeholder="MITRE filter…"
            className="no-drag text-xs rounded px-2.5 py-1.5 w-32 font-mono"
            style={{
              background: '#07080f',
              border: '1px solid rgba(42,51,71,0.6)',
              color: '#e6edf3',
            }}
          />
          <button
            onClick={handleImportFile}
            className="no-drag text-xs px-2.5 py-1.5 rounded font-medium transition-colors"
            style={{
              background: 'rgba(42,51,71,0.3)',
              border: '1px solid rgba(42,51,71,0.5)',
              color: '#8b949e',
            }}
          >
            Import
          </button>
          <button
            onClick={() => setShowVapt(v => !v)}
            className="no-drag text-xs px-2.5 py-1.5 rounded font-medium transition-colors"
            style={{
              background: showVapt ? 'rgba(45,212,191,0.10)' : 'rgba(42,51,71,0.3)',
              border: `1px solid ${showVapt ? 'rgba(45,212,191,0.25)' : 'rgba(42,51,71,0.5)'}`,
              color: showVapt ? '#2dd4bf' : '#8b949e',
            }}
          >
            VAPT Methods
          </button>
          <button
            onClick={handleNew}
            className="no-drag text-xs px-3 py-1.5 rounded font-semibold transition-colors"
            style={{
              background: 'rgba(45,212,191,0.14)',
              color: '#2dd4bf',
              border: '1px solid rgba(45,212,191,0.30)',
            }}
          >
            + New Playbook
          </button>
        </div>
      </div>

      {/* VAPT methodology panel */}
      {showVapt && (
        <div
          className="px-4 py-3 flex-shrink-0 flex flex-col gap-2"
          style={{ background: 'rgba(45,212,191,0.03)', borderBottom: '1px solid rgba(45,212,191,0.12)' }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-2"
            style={{ color: '#2dd4bf' }}
          >
            <div className="w-px h-3 rounded-full" style={{ background: '#2dd4bf' }} />
            Import VAPT Methodology
          </div>
          <div className="flex flex-wrap gap-2">
            {VAPT_METHODOLOGIES.map(m => (
              <button
                key={m.id}
                onClick={() => importVapt(m)}
                className="text-xs px-3 py-1.5 rounded transition-colors"
                style={{
                  background: '#07080f',
                  border: '1px solid rgba(42,51,71,0.6)',
                  color: '#8b949e',
                }}
                title={m.description}
              >
                {m.name}
              </button>
            ))}
          </div>
          <div className="text-xs" style={{ color: '#484f58' }}>
            Each phase becomes a step. Imports as a custom playbook you can edit.
          </div>
        </div>
      )}

      {importStatus && (
        <div
          className="px-4 py-2 text-xs flex-shrink-0 flex items-center gap-2"
          style={{
            background: importStatus.startsWith('Parse') ? 'rgba(248,81,73,0.06)' : 'rgba(45,212,191,0.06)',
            color: importStatus.startsWith('Parse') ? '#f85149' : '#2dd4bf',
            borderBottom: '1px solid rgba(42,51,71,0.4)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: importStatus.startsWith('Parse') ? '#f85149' : '#2dd4bf' }}
          />
          {importStatus}
        </div>
      )}

      {/* Playbook grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-4 anim-fade-in-up">
            <div style={{ position: 'relative' }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ filter: 'drop-shadow(0 0 18px rgba(45,212,191,0.15))' }}>
                <rect x="5" y="10" width="46" height="36" rx="5" stroke="rgba(45,212,191,0.25)" strokeWidth="1.5" fill="rgba(45,212,191,0.04)" />
                <path d="M13 20h30M13 27h20M13 34h24" stroke="rgba(45,212,191,0.25)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="42" cy="42" r="10" fill="rgba(7,8,15,1)" stroke="rgba(45,212,191,0.30)" strokeWidth="1.5" />
                <path d="M42 37v5l3 3" stroke="rgba(45,212,191,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium" style={{ color: '#6b7280' }}>
                No playbooks found
              </span>
              <span className="text-xs" style={{ color: '#484f58' }}>
                Try a different filter or create a new playbook
              </span>
            </div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map((pb, i) => <PlaybookCard key={pb.id} pb={pb} searchTerm={searchTerm} staggerIndex={i} />)}
          </div>
        )}
      </div>

      {importPreview && (
        <ImportPreviewModal
          playbook={importPreview}
          onConfirm={confirmImport}
          onCancel={() => setImportPreview(null)}
        />
      )}
    </div>
  )
}
