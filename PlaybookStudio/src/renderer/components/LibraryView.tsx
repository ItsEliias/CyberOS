import { useState } from 'react'
import { useStore } from '../store'
import type { Playbook, PlaybookCategory } from '@shared/types'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all',              label: 'All' },
  { id: 'templates',        label: 'Templates' },
  { id: 'web-app',          label: 'Web App' },
  { id: 'network',          label: 'Network' },
  { id: 'active-directory', label: 'Active Directory' },
  { id: 'linux',            label: 'Linux' },
  { id: 'windows',          label: 'Windows' },
  { id: 'ctf',              label: 'CTF' },
  { id: 'ccna',             label: 'CCNA' },
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
  'ccna':             '#f0883e',
}

// ─── VAPT Methodology Builder ─────────────────────────────────────────────────

interface VaptMethodology {
  id: string
  name: string
  description: string
  phases: { name: string; description: string }[]
}

const VAPT_METHODOLOGIES: VaptMethodology[] = [
  {
    id: 'owasp-otg',
    name: 'OWASP Testing Guide v4',
    description: 'OWASP OTG v4 — 11 test categories covering all aspects of web app security.',
    phases: [
      { name: 'OTG-INFO: Information Gathering', description: 'Gather information about the target web application using passive and active techniques including fingerprinting, directory enumeration, and application mapping.' },
      { name: 'OTG-CONFIG: Configuration and Deployment', description: 'Review network, application, and file extension configurations. Test for default credentials, incomplete/insecure backups, and HTTP methods.' },
      { name: 'OTG-IDENT: Identity Management', description: 'Test account provisioning, account enumeration, username policies, and password policies.' },
      { name: 'OTG-AUTHN: Authentication', description: 'Test authentication mechanisms including brute force protection, bypass techniques, credential transport security, and multi-factor implementations.' },
      { name: 'OTG-AUTHZ: Authorization', description: 'Test path traversal, authorization bypass, privilege escalation, and insecure direct object references (IDOR).' },
      { name: 'OTG-SESS: Session Management', description: 'Test session token randomness, cookie attributes, CSRF, session fixation, and logout functionality.' },
      { name: 'OTG-INPVAL: Input Validation', description: 'Test for XSS, SQL injection, LDAP injection, XML injection, SSI injection, XPath injection, IMAP/SMTP injection, code injection, and buffer overflow.' },
      { name: 'OTG-ERR: Error Handling', description: 'Analyze error codes and stack traces for information leakage. Verify generic error messages in production.' },
      { name: 'OTG-CRYPST: Cryptography', description: 'Test SSL/TLS configuration, cipher suites, weak algorithms, and certificate validation.' },
      { name: 'OTG-BUSLOGIC: Business Logic', description: 'Test business logic data validation, request forgery, data integrity, and process timing vulnerabilities.' },
      { name: 'OTG-CLIENT: Client Side', description: 'Test DOM-based XSS, JavaScript execution, HTML injection, CSS injection, clickjacking, and WebSocket security.' },
    ],
  },
  {
    id: 'ptes',
    name: 'PTES (Penetration Testing Execution Standard)',
    description: 'PTES 7-phase framework covering the full lifecycle of a penetration test.',
    phases: [
      { name: 'Pre-Engagement Interactions', description: 'Scope definition, rules of engagement, legal agreements, emergency contacts, and timeline establishment.' },
      { name: 'Intelligence Gathering', description: 'OSINT collection covering technical and non-technical information: WHOIS, DNS, network ranges, employee data, social media.' },
      { name: 'Threat Modeling', description: 'Identify business assets, threat communities, attack vectors, and risk levels to prioritize testing efforts.' },
      { name: 'Vulnerability Analysis', description: 'Active and passive vulnerability identification via automated scanning, manual testing, and vulnerability research.' },
      { name: 'Exploitation', description: 'Attempt exploitation of identified vulnerabilities to validate their existence and determine business impact.' },
      { name: 'Post-Exploitation', description: 'Establish persistence, enumerate sensitive data, pivot to adjacent systems, and demonstrate true business impact.' },
      { name: 'Reporting', description: 'Document all findings with executive summary, technical findings (CVSS-scored), evidence, and actionable remediation guidance.' },
    ],
  },
  {
    id: 'nist-800-115',
    name: 'NIST SP 800-115',
    description: 'NIST 800-115 Technical Guide to Information Security Testing — 4 core phases.',
    phases: [
      { name: 'Planning', description: 'Define objectives, scope, and constraints. Identify testing rules of engagement, obtain authorization, coordinate logistics, and establish communication channels.' },
      { name: 'Discovery', description: 'Technical data collection: network scanning, host discovery, service identification, OS fingerprinting, and vulnerability scanning to build the target asset inventory.' },
      { name: 'Attack', description: 'Attempt to validate discovered vulnerabilities by gaining unauthorized access, escalating privileges, pivoting across systems, and documenting successful exploits.' },
      { name: 'Reporting', description: 'Analyze findings, correlate data from all phases, and produce deliverables: executive summary, technical findings, risk ratings, and prioritized remediation roadmap.' },
    ],
  },
]

function buildVaptPlaybook(methodology: VaptMethodology): Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString()
  return {
    name: methodology.name,
    description: methodology.description,
    category: 'web-app',
    tags: ['methodology', 'vapt'],
    version: '1.0',
    isBuiltIn: false,
    steps: methodology.phases.map((phase, idx) => ({
      id: `vapt-${methodology.id}-${idx + 1}`,
      order: idx + 1,
      title: phase.name,
      description: phase.description,
      category: 'recon' as const,
      commands: [],
      notes: phase.description,
      required: true,
      stepType: 'documentation' as const,
    })),
  }
}

// ─── Import preview modal ─────────────────────────────────────────────────────

function ImportPreviewModal({
  playbook, onConfirm, onCancel,
}: {
  playbook: Partial<Playbook>
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ width: 400, background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Import Playbook Preview</h2>
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{playbook.name ?? 'Untitled'}</div>
          {playbook.description && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{playbook.description}</div>}
          <div className="text-xs" style={{ color: 'var(--accent)' }}>{playbook.steps?.length ?? 0} steps · {playbook.category}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="flex-1 text-xs py-2 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 text-xs py-2 rounded font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>Import</button>
        </div>
      </div>
    </div>
  )
}

// ─── Playbook Card ─────────────────────────────────────────────────────────────

function PlaybookCard({ pb }: { pb: Playbook }) {
  const setView           = useStore(s => s.setView)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setRuns           = useStore(s => s.setRuns)
  const setActiveRun      = useStore(s => s.setActiveRun)
  const setPlaybooks      = useStore(s => s.setPlaybooks)
  const runs              = useStore(s => s.runs)
  const [exporting, setExporting] = useState(false)

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
    if (res.ok) {
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

  async function handleExportBundle() {
    setExporting(true)
    await window.electronAPI.exportBundle(pb.id)
    setExporting(false)
  }

  const catColor    = CAT_COLORS[pb.category] ?? 'var(--text-muted)'
  const lastRun     = runs
    .filter(r => r.playbookId === pb.id && (r.status === 'completed' || r.status === 'abandoned'))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
  const lastRunLabel = lastRun ? new Date(lastRun.startedAt).toLocaleDateString() : null
  const mitreTactics = [...new Set(pb.steps.flatMap(s => s.mitreTechniqueId ? [s.mitreTechniqueId.split('.')[0]] : []))]

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2 transition-colors"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: `${catColor}22`, color: catColor }}>
              {pb.category}
            </span>
            {pb.isBuiltIn && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                built-in
              </span>
            )}
            {mitreTactics.slice(0, 2).map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(188,140,255,0.1)', color: '#bc8cff' }}>{t}</span>
            ))}
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{pb.name}</div>
          <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-dim)' }}>{pb.description}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {pb.steps.length} steps{lastRunLabel ? ` · last run ${lastRunLabel}` : ''}
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={handleRun} className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors" style={{ background: 'var(--accent)', color: '#fff' }}>Run</button>
          <button onClick={handleClone} className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Clone</button>
          <button onClick={handleExportBundle} disabled={exporting} className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
            {exporting ? '…' : 'Export'}
          </button>
          {!pb.isBuiltIn && (
            <>
              <button onClick={handleEdit} className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Edit</button>
              <button onClick={handleDelete} className="no-drag text-xs px-2 py-1 rounded font-medium transition-colors" style={{ background: 'rgba(248,81,73,0.15)', color: 'var(--error)' }}>Delete</button>
            </>
          )}
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
        // Dynamic import for js-yaml
        const yaml = await import('js-yaml')
        parsed = yaml.load(res.content) as Partial<Playbook>
      } else {
        parsed = JSON.parse(res.content) as Partial<Playbook>
      }

      // Handle array (bundle format) or single playbook
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
                background: categoryFilter === cat.id ? 'var(--accent)' : 'var(--panel)',
                color:      categoryFilter === cat.id ? '#fff' : 'var(--text-dim)',
                border:     `1px solid ${categoryFilter === cat.id ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <input value={mitreFilter} onChange={e => setMitreFilter(e.target.value)}
            placeholder="MITRE filter…" className="no-drag text-xs rounded px-2 py-1.5 w-32"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          <button
            onClick={handleImportFile}
            className="no-drag text-xs px-2.5 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
          >
            Import
          </button>
          <button
            onClick={() => setShowVapt(v => !v)}
            className="no-drag text-xs px-2.5 py-1.5 rounded font-medium transition-colors"
            style={{ background: showVapt ? 'rgba(74,158,255,0.15)' : 'var(--panel)', border: '1px solid var(--border)', color: showVapt ? 'var(--accent)' : 'var(--text-dim)' }}
          >
            VAPT Methods
          </button>
          <button
            onClick={handleNew}
            className="no-drag text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + New Playbook
          </button>
        </div>
      </div>

      {/* VAPT methodology panel */}
      {showVapt && (
        <div
          className="px-4 py-3 flex-shrink-0 flex flex-col gap-2"
          style={{ background: 'rgba(74,158,255,0.04)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>
            Import VAPT Methodology
          </div>
          <div className="flex flex-wrap gap-2">
            {VAPT_METHODOLOGIES.map(m => (
              <button
                key={m.id}
                onClick={() => importVapt(m)}
                className="text-xs px-3 py-1.5 rounded transition-colors"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                title={m.description}
              >
                {m.name}
              </button>
            ))}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Each phase becomes a step. Imports as a custom playbook you can edit.
          </div>
        </div>
      )}

      {importStatus && (
        <div
          className="px-4 py-2 text-xs flex-shrink-0"
          style={{
            background: importStatus.startsWith('Parse') ? 'rgba(248,81,73,0.08)' : 'rgba(63,185,80,0.08)',
            color: importStatus.startsWith('Parse') ? 'var(--error)' : 'var(--success)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {importStatus}
        </div>
      )}

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
