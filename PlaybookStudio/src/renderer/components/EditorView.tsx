import { useState, useCallback } from 'react'
import { useStore } from '../store'
import type { Playbook, PlaybookStep, PlaybookCategory } from '@shared/types'
import StepEditorRow from './editor/StepEditor'

const PB_CATS: PlaybookCategory[] = ['web-app', 'network', 'active-directory', 'linux', 'windows', 'ctf', 'custom', 'ccna']
const API_KEY_STORAGE = 'playbookstudio_anthropic_key'

function uid() { return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

// ─── AI Generate Modal ────────────────────────────────────────────────────────

function AiGenerateModal({
  onInsert, onClose,
}: {
  onInsert: (steps: Partial<PlaybookStep>[]) => void
  onClose: () => void
}) {
  const [objective, setObjective] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [preview,   setPreview]   = useState<Partial<PlaybookStep>[] | null>(null)
  const apiKey = localStorage.getItem(API_KEY_STORAGE) ?? ''

  async function generate() {
    if (!objective.trim()) { setError('Enter an objective.'); return }
    if (!apiKey) { setError('Configure your Anthropic API key in Settings first.'); return }
    setLoading(true); setError('')
    const res = await window.electronAPI.generateSteps(objective.trim(), apiKey)
    setLoading(false)
    if (!res.ok || !res.steps) { setError(res.error ?? 'Generation failed'); return }
    setPreview(res.steps)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div style={{
        width: 500, maxHeight: '80vh',
        background: '#0d0e18',
        border: '1px solid rgba(42,51,71,0.75)',
        borderRadius: 12,
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column', padding: 20, gap: 16, overflow: 'hidden',
      }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Generate Steps with AI</h2>
          <p className="text-xs mt-0.5" style={{ color: '#484f58' }}>Uses Claude Haiku to generate playbook steps from an objective.</p>
        </div>

        {!apiKey && (
          <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(210,153,34,0.06)', border: '1px solid rgba(210,153,34,0.2)', color: '#d29922' }}>
            No API key. Go to Settings and add your Anthropic API key.
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#8b949e' }}>Objective</label>
          <input
            className="w-full rounded px-2.5 py-2 text-sm"
            style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.75)', color: '#e6edf3' }}
            placeholder="e.g. Enumerate an Active Directory environment with BloodHound"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && generate()}
            disabled={loading || !apiKey}
            autoFocus
          />
        </div>

        {error && <p className="text-xs" style={{ color: '#f85149' }}>{error}</p>}

        {preview && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
            <div className="text-xs font-semibold" style={{ color: '#8b949e' }}>Preview — {preview.length} steps</div>
            {preview.map((s, i) => (
              <div key={i} className="rounded px-3 py-2" style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.5)' }}>
                <div className="text-xs font-medium" style={{ color: '#e6edf3' }}>{i + 1}. {s.title}</div>
                {s.description && <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{s.description}</div>}
                {s.commands && s.commands.length > 0 && (
                  <div className="text-xs font-mono mt-1" style={{ color: '#2dd4bf' }}>{s.commands[0]}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="flex-1 text-xs py-2 rounded" style={{ background: 'rgba(42,51,71,0.35)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}>
            Cancel
          </button>
          {!preview ? (
            <button
              onClick={generate}
              disabled={loading || !apiKey}
              className="flex-1 text-xs py-2 rounded font-semibold"
              style={{
                background: (loading || !apiKey) ? 'rgba(42,51,71,0.35)' : 'rgba(45,212,191,0.14)',
                color: (loading || !apiKey) ? '#484f58' : '#2dd4bf',
                border: `1px solid ${(loading || !apiKey) ? 'rgba(42,51,71,0.5)' : 'rgba(45,212,191,0.28)'}`,
              }}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="text-xs py-2 px-3 rounded" style={{ background: 'rgba(42,51,71,0.35)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}>
                Retry
              </button>
              <button
                onClick={() => onInsert(preview)}
                className="flex-1 text-xs py-2 rounded font-semibold"
                style={{ background: 'rgba(63,185,80,0.14)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.28)' }}
              >
                Insert {preview.length} Steps
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Variables Panel ──────────────────────────────────────────────────────────

function VariablesPanel({ vars, disabled, onChange }: {
  vars: Record<string, string>; disabled: boolean; onChange: (v: Record<string, string>) => void
}) {
  const [newKey, setNewKey] = useState('')

  function addVar() {
    if (!newKey.trim() || vars[newKey] !== undefined) return
    onChange({ ...vars, [newKey.trim()]: '' })
    setNewKey('')
  }

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: '#0d0e18', border: '1px solid rgba(42,51,71,0.6)' }}>
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#2dd4bf' }}
        >
          <div className="w-px h-3 rounded-full" style={{ background: '#2dd4bf' }} />
          Variables
        </span>
        <span className="text-xs" style={{ color: '#484f58' }}>Use {'{{key}}'} in descriptions &amp; commands</span>
      </div>
      {Object.entries(vars).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.18)', minWidth: 80 }}
          >
            {'{{'}{k}{'}}'}
          </span>
          <input
            className="flex-1 rounded px-2 py-1 text-xs font-mono"
            style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.6)', color: '#e6edf3' }}
            value={v} disabled={disabled} placeholder="default value"
            onChange={e => onChange({ ...vars, [k]: e.target.value })}
          />
          {!disabled && (
            <button
              onClick={() => { const n = { ...vars }; delete n[k]; onChange(n) }}
              className="text-xs px-1.5 py-1 rounded flex-shrink-0"
              style={{ background: 'rgba(248,81,73,0.08)', color: '#f85149', border: '1px solid rgba(248,81,73,0.2)' }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid rgba(42,51,71,0.35)' }}>
          <input
            className="flex-1 rounded px-2 py-1 text-xs font-mono"
            style={{ background: '#07080f', border: '1px solid rgba(42,51,71,0.6)', color: '#e6edf3' }}
            placeholder="new variable name" value={newKey}
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVar()}
          />
          <button
            onClick={addVar}
            className="text-xs px-3 py-1 rounded"
            style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.20)' }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Dependency Graph ─────────────────────────────────────────────────────────

function DependencyGraph({ steps }: { steps: PlaybookStep[] }) {
  const hasDeps = steps.some(s => s.dependsOn && s.dependsOn.length > 0)
  if (!hasDeps) return null
  return (
    <div className="rounded-lg p-3" style={{ background: '#0d0e18', border: '1px solid rgba(42,51,71,0.6)' }}>
      <span
        className="text-xs font-semibold uppercase tracking-widest block mb-2 flex items-center gap-2"
        style={{ color: '#8b949e' }}
      >
        <div className="w-px h-3 rounded-full" style={{ background: '#8b949e' }} />
        Dependency Graph
      </span>
      <div className="flex flex-col gap-1">
        {steps.map(step => {
          const deps = (step.dependsOn ?? []).map(id => steps.find(s => s.id === id)).filter(Boolean) as PlaybookStep[]
          if (deps.length === 0) return null
          return (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              <span style={{ color: '#8b949e' }}>{step.order}. {step.title.slice(0, 20)}</span>
              <span style={{ color: '#2d3548' }}>← needs</span>
              <span style={{ color: '#2dd4bf' }}>{deps.map(d => `${d.order}. ${d.title.slice(0, 16)}`).join(', ')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Versions Dropdown ────────────────────────────────────────────────────────

function VersionsDropdown({ pb, onRestore }: { pb: Playbook; onRestore: (idx: number) => void }) {
  const [open, setOpen] = useState(false)
  const versions = pb.versions ?? []
  if (versions.length === 0) return null
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs px-2.5 py-1.5 rounded"
        style={{ background: 'rgba(42,51,71,0.3)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}
      >
        Versions ({versions.length})
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden"
          style={{ width: 280, background: '#0d0e18', border: '1px solid rgba(42,51,71,0.75)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
        >
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(42,51,71,0.5)' }}>
            <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>Version History</span>
            <button onClick={() => setOpen(false)} className="text-xs" style={{ color: '#484f58' }}>✕</button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {versions.map((v, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: '#e6edf3' }}>v{v.version}</div>
                  <div className="text-xs font-mono" style={{ color: '#484f58' }}>
                    {new Date(v.savedAt).toLocaleString()} · {v.snapshot.steps.length} steps
                  </div>
                </div>
                <button
                  onClick={() => { onRestore(i); setOpen(false) }}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.20)' }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EditorView ───────────────────────────────────────────────────────────────

export default function EditorView() {
  const activePlaybook    = useStore(s => s.activePlaybook)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setPlaybooks      = useStore(s => s.setPlaybooks)
  const setView           = useStore(s => s.setView)

  const [pb, setPb] = useState<Playbook>(() => activePlaybook ?? {
    id: `custom-${Date.now()}`,
    name: '', description: '', category: 'custom', tags: [],
    version: '1.0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    steps: [], isBuiltIn: false, variables: {},
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [showAi,  setShowAi]  = useState(false)
  const disabled = pb.isBuiltIn

  const updateStep = useCallback((idx: number, updated: PlaybookStep) => {
    setPb(p => ({ ...p, steps: p.steps.map((s, i) => i === idx ? updated : s) }))
  }, [])

  const deleteStep = useCallback((idx: number) => {
    setPb(p => ({ ...p, steps: p.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })) }))
  }, [])

  const duplicateStep = useCallback((idx: number) => {
    setPb(p => {
      const copy = { ...p.steps[idx], id: uid(), order: idx + 2 }
      const next = [...p.steps.slice(0, idx + 1), copy, ...p.steps.slice(idx + 1)]
      return { ...p, steps: next.map((s, i) => ({ ...s, order: i + 1 })) }
    })
  }, [])

  const moveStep = useCallback((idx: number, dir: -1 | 1) => {
    setPb(p => {
      const steps = [...p.steps]
      const target = idx + dir
      if (target < 0 || target >= steps.length) return p
      ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
      return { ...p, steps: steps.map((s, i) => ({ ...s, order: i + 1 })) }
    })
  }, [])

  function addStep() {
    setPb(p => ({ ...p, steps: [...p.steps, {
      id: uid(), order: p.steps.length + 1, title: '', description: '',
      category: 'recon' as const, commands: [], notes: '', required: false, stepType: 'action' as const,
    }] }))
  }

  async function handleSave() {
    if (!pb.name.trim()) { setError('Playbook name is required.'); return }
    setSaving(true); setError('')
    const res = await window.electronAPI.savePlaybook(pb)
    if (res.ok && res.playbook) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all); setActivePlaybook(res.playbook); setPb(res.playbook)
    } else { setError(res.error ?? 'Save failed') }
    setSaving(false)
  }

  async function handleRestoreVersion(idx: number) {
    if (!confirm('Restore this version? Unsaved changes will be lost.')) return
    const res = await window.electronAPI.restoreVersion(pb.id, idx)
    if (res.ok && res.playbook) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all); setActivePlaybook(res.playbook); setPb(res.playbook)
    }
  }

  function insertAiSteps(aiSteps: Partial<PlaybookStep>[]) {
    setPb(p => {
      const base = p.steps.length
      const newSteps: PlaybookStep[] = aiSteps.map((s, i) => ({
        id: uid(), order: base + i + 1,
        title: s.title ?? '', description: s.description ?? '',
        category: (s.category as PlaybookStep['category']) ?? 'recon',
        commands: s.commands ?? [], notes: s.notes ?? '',
        required: false, stepType: s.stepType,
      }))
      return { ...p, steps: [...p.steps, ...newSteps] }
    })
    setShowAi(false)
  }

  const inputStyle: React.CSSProperties = {
    background: '#07080f',
    border: '1px solid rgba(42,51,71,0.6)',
    color: '#e6edf3',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: '13px',
    width: '100%',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.5)', background: 'rgba(13,14,24,0.8)' }}
      >
        <button
          onClick={() => setView('library')}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded transition-colors"
          style={{ background: 'rgba(42,51,71,0.3)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.5)' }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2L3 6l5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Library
        </button>

        <div
          className="w-px h-4 flex-shrink-0"
          style={{ background: 'rgba(42,51,71,0.6)' }}
        />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: disabled ? '#484f58' : '#2dd4bf' }}
          />
          <span className="text-sm font-medium truncate" style={{ color: '#e6edf3' }}>
            {disabled ? `${pb.name} (view only)` : (pb.name || 'Untitled Playbook')}
          </span>
        </div>

        {error && <span className="text-xs flex-shrink-0" style={{ color: '#f85149' }}>{error}</span>}
        {!disabled && <VersionsDropdown pb={pb} onRestore={handleRestoreVersion} />}
        {!disabled && (
          <button
            onClick={() => setShowAi(true)}
            className="text-xs px-2.5 py-1.5 rounded font-medium flex items-center gap-1"
            style={{
              background: 'rgba(45,212,191,0.08)',
              color: '#2dd4bf',
              border: '1px solid rgba(45,212,191,0.20)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 1l1.2 2.5L9 5 6.2 6.5 5 9 3.8 6.5 1 5l2.8-1.5z" />
            </svg>
            AI Steps
          </button>
        )}
        {!disabled && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded font-semibold"
            style={{
              background: saving ? 'rgba(42,51,71,0.35)' : 'rgba(45,212,191,0.14)',
              color: saving ? '#484f58' : '#2dd4bf',
              border: `1px solid ${saving ? 'rgba(42,51,71,0.5)' : 'rgba(45,212,191,0.28)'}`,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Metadata panel */}
        <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: '#0d0e18', border: '1px solid rgba(42,51,71,0.6)' }}>
          <div
            className="flex items-center gap-2 mb-1"
            style={{ borderBottom: '1px solid rgba(42,51,71,0.35)', paddingBottom: 10 }}
          >
            <div className="w-px h-4 rounded-full" style={{ background: '#2dd4bf' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#2dd4bf' }}>Playbook Details</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: '#8b949e' }}>Name</label>
              <input style={inputStyle}
                value={pb.name} disabled={disabled} onChange={e => setPb(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8b949e' }}>Category</label>
              <select
                style={{ ...inputStyle, width: 'auto' }}
                value={pb.category} disabled={disabled}
                onChange={e => setPb(p => ({ ...p, category: e.target.value as PlaybookCategory }))}
              >
                {PB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: '#8b949e' }}>Version</label>
              <input
                style={{ ...inputStyle, width: 80 }}
                value={pb.version} disabled={disabled}
                onChange={e => setPb(p => ({ ...p, version: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#8b949e' }}>Description</label>
            <textarea rows={2} style={inputStyle}
              value={pb.description} disabled={disabled}
              onChange={e => setPb(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#8b949e' }}>Tags (comma-separated)</label>
            <input style={inputStyle}
              value={pb.tags.join(', ')} disabled={disabled}
              onChange={e => setPb(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} />
          </div>
        </div>

        <VariablesPanel vars={pb.variables ?? {}} disabled={disabled} onChange={v => setPb(p => ({ ...p, variables: v }))} />
        <DependencyGraph steps={pb.steps} />

        {/* Steps section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-px h-4 rounded-full" style={{ background: '#2dd4bf' }} />
            <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>
              Steps
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono tabular-nums"
              style={{ background: 'rgba(45,212,191,0.08)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.18)' }}
            >
              {pb.steps.length}
            </span>
          </div>
          {!disabled && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowAi(true)}
                className="text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1"
                style={{ background: 'rgba(45,212,191,0.06)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.18)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 1l1.2 2.5L9 5 6.2 6.5 5 9 3.8 6.5 1 5l2.8-1.5z" />
                </svg>
                Generate
              </button>
              <button
                onClick={addStep}
                className="text-xs px-2.5 py-1 rounded font-medium"
                style={{ background: 'rgba(45,212,191,0.10)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.22)' }}
              >
                + Add Step
              </button>
            </div>
          )}
        </div>

        {pb.steps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-lg" style={{ border: '1px dashed rgba(42,51,71,0.4)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: '#2d3548' }}>
              <rect x="3" y="5" width="22" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 10v8M10 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm" style={{ color: '#484f58' }}>No steps yet. Add your first step above.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {pb.steps.map((step, idx) => (
            <StepEditorRow
              key={step.id} step={step} index={idx} total={pb.steps.length}
              allSteps={pb.steps} disabled={disabled}
              onChange={s => updateStep(idx, s)}
              onDelete={() => deleteStep(idx)}
              onDuplicate={() => duplicateStep(idx)}
              onMoveUp={() => moveStep(idx, -1)}
              onMoveDown={() => moveStep(idx, 1)}
            />
          ))}
        </div>
      </div>

      {showAi && !disabled && (
        <AiGenerateModal onInsert={insertAiSteps} onClose={() => setShowAi(false)} />
      )}
    </div>
  )
}
