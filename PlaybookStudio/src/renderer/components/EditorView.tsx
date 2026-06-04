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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div style={{ width: 500, maxHeight: '80vh', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', padding: 20, gap: 16, overflow: 'hidden' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Generate Steps with AI</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Uses Claude Haiku to generate playbook steps from an objective.</p>
        </div>

        {!apiKey && (
          <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.2)', color: 'var(--warning)' }}>
            No API key. Go to Settings and add your Anthropic API key.
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Objective</label>
          <input
            className="w-full rounded px-2.5 py-2 text-sm"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="e.g. Enumerate an Active Directory environment with BloodHound"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && generate()}
            disabled={loading || !apiKey}
            autoFocus
          />
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}

        {preview && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Preview — {preview.length} steps</div>
            {preview.map((s, i) => (
              <div key={i} className="rounded px-3 py-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{i + 1}. {s.title}</div>
                {s.description && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.description}</div>}
                {s.commands && s.commands.length > 0 && (
                  <div className="text-xs font-mono mt-1" style={{ color: 'var(--accent)' }}>{s.commands[0]}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="flex-1 text-xs py-2 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Cancel</button>
          {!preview ? (
            <button onClick={generate} disabled={loading || !apiKey} className="flex-1 text-xs py-2 rounded font-semibold"
              style={{ background: (loading || !apiKey) ? 'var(--border)' : 'var(--accent)', color: (loading || !apiKey) ? 'var(--text-muted)' : '#fff' }}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          ) : (
            <>
              <button onClick={() => setPreview(null)} className="text-xs py-2 px-3 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Retry</button>
              <button onClick={() => onInsert(preview)} className="flex-1 text-xs py-2 rounded font-semibold" style={{ background: 'var(--success)', color: '#000' }}>
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
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Variables</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Use {'{{key}}'} in descriptions &amp; commands</span>
      </div>
      {Object.entries(vars).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(74,158,255,0.12)', color: '#4a9eff', minWidth: 80 }}>
            {'{{'}{k}{'}}'}
          </span>
          <input className="flex-1 rounded px-2 py-1 text-xs font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            value={v} disabled={disabled} placeholder="default value"
            onChange={e => onChange({ ...vars, [k]: e.target.value })} />
          {!disabled && (
            <button onClick={() => { const n = { ...vars }; delete n[k]; onChange(n) }}
              className="text-xs px-1.5 py-1 rounded flex-shrink-0" style={{ background: 'rgba(248,81,73,0.12)', color: 'var(--error)' }}>
              ✕
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <input className="flex-1 rounded px-2 py-1 text-xs font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="new variable name" value={newKey} onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVar()} />
          <button onClick={addVar} className="text-xs px-3 py-1 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Add</button>
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
    <div className="rounded-lg p-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>Dependency Graph</span>
      <div className="flex flex-col gap-1">
        {steps.map(step => {
          const deps = (step.dependsOn ?? []).map(id => steps.find(s => s.id === id)).filter(Boolean) as PlaybookStep[]
          if (deps.length === 0) return null
          return (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>{step.order}. {step.title.slice(0, 20)}</span>
              <span style={{ color: 'var(--border)' }}>← needs</span>
              <span style={{ color: 'var(--accent)' }}>{deps.map(d => `${d.order}. ${d.title.slice(0, 16)}`).join(', ')}</span>
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
      <button onClick={() => setOpen(o => !o)} className="text-xs px-2.5 py-1.5 rounded"
        style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
        Versions ({versions.length})
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden"
          style={{ width: 280, background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Version History</span>
            <button onClick={() => setOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {versions.map((v, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>v{v.version}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(v.savedAt).toLocaleString()} · {v.snapshot.steps.length} steps
                  </div>
                </div>
                <button onClick={() => { onRestore(i); setOpen(false) }} className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <button onClick={() => setView('library')} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Library
        </button>
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
          {disabled ? `${pb.name} (view only)` : (pb.name || 'Untitled Playbook')}
        </span>
        {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}
        {!disabled && <VersionsDropdown pb={pb} onRestore={handleRestoreVersion} />}
        {!disabled && (
          <button onClick={() => setShowAi(true)} className="text-xs px-2.5 py-1.5 rounded font-medium"
            style={{ background: 'rgba(74,158,255,0.1)', color: 'var(--accent)', border: '1px solid rgba(74,158,255,0.2)' }}>
            ✨ AI Steps
          </button>
        )}
        {!disabled && (
          <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input className="w-full rounded px-2 py-1.5 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={pb.name} disabled={disabled} onChange={e => setPb(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
              <select className="rounded px-2 py-1.5 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={pb.category} disabled={disabled} onChange={e => setPb(p => ({ ...p, category: e.target.value as PlaybookCategory }))}>
                {PB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Version</label>
              <input className="w-20 rounded px-2 py-1.5 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={pb.version} disabled={disabled} onChange={e => setPb(p => ({ ...p, version: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea rows={2} className="w-full rounded px-2 py-1.5 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={pb.description} disabled={disabled} onChange={e => setPb(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Tags (comma-separated)</label>
            <input className="w-full rounded px-2 py-1.5 text-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={pb.tags.join(', ')} disabled={disabled}
              onChange={e => setPb(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} />
          </div>
        </div>

        <VariablesPanel vars={pb.variables ?? {}} disabled={disabled} onChange={v => setPb(p => ({ ...p, variables: v }))} />
        <DependencyGraph steps={pb.steps} />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Steps ({pb.steps.length})</span>
          {!disabled && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowAi(true)} className="text-xs px-2.5 py-1 rounded font-medium"
                style={{ background: 'rgba(74,158,255,0.08)', color: 'var(--accent)', border: '1px solid rgba(74,158,255,0.2)' }}>
                ✨ Generate
              </button>
              <button onClick={addStep} className="text-xs px-2.5 py-1 rounded font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                + Add Step
              </button>
            </div>
          )}
        </div>

        {pb.steps.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}><p className="text-sm">No steps yet.</p></div>
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
