import { useState, useCallback } from 'react'
import { useStore } from '../store'
import type { Playbook, PlaybookStep, PlaybookCategory } from '@shared/types'
import StepEditorRow from './editor/StepEditor'
import { AiGenerateModal, VariablesPanel } from './editor/EditorHelpers'

const PB_CATS: PlaybookCategory[] = ['web-app', 'network', 'active-directory', 'linux', 'windows', 'ctf', 'custom', 'ccna']

function uid() { return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

// ─── Dependency Graph (SVG arrows) ───────────────────────────────────────────

function DependencyGraph({ steps }: { steps: PlaybookStep[] }) {
  const hasDeps = steps.some(s => s.dependsOn && s.dependsOn.length > 0)
  if (!hasDeps) return null

  const ROW_H = 28
  const COL_W = 160
  const PAD   = 12
  const stepsWithDeps = steps.filter(s => s.dependsOn && s.dependsOn.length > 0)
  // Build unique node list: all steps that appear as source or target of a dep
  const nodeIds = new Set<string>()
  stepsWithDeps.forEach(s => {
    nodeIds.add(s.id)
    ;(s.dependsOn ?? []).forEach(d => nodeIds.add(d))
  })
  const nodes = [...nodeIds].map(id => steps.find(s => s.id === id)).filter(Boolean) as PlaybookStep[]
  nodes.sort((a, b) => a.order - b.order)

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]))
  const svgH = nodes.length * ROW_H + PAD * 2
  const svgW = COL_W * 2 + 80

  return (
    <div className="rounded-lg p-3" style={{ background: '#0d0e18', border: '1px solid rgba(42,51,71,0.6)' }}>
      <span
        className="text-xs font-semibold uppercase tracking-widest block mb-2 flex items-center gap-2"
        style={{ color: '#8b949e' }}
      >
        <div className="w-px h-3 rounded-full" style={{ background: '#8b949e' }} />
        Dependency Graph
      </span>
      <div style={{ overflowX: 'auto' }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
          <defs>
            <marker id="dep-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(45,212,191,0.6)" />
            </marker>
          </defs>
          {/* Node labels */}
          {nodes.map((node, i) => {
            const y = PAD + i * ROW_H + ROW_H / 2
            const hasDep = stepsWithDeps.some(s => s.id === node.id)
            return (
              <g key={node.id}>
                <rect x={PAD} y={PAD + i * ROW_H + 2} width={COL_W - 8} height={ROW_H - 6}
                  rx={4} fill={hasDep ? 'rgba(45,212,191,0.06)' : 'rgba(42,51,71,0.15)'}
                  stroke={hasDep ? 'rgba(45,212,191,0.22)' : 'rgba(42,51,71,0.4)'} strokeWidth={1} />
                <text x={PAD + 6} y={y + 1} fontSize={10} fill={hasDep ? '#2dd4bf' : '#8b949e'} dominantBaseline="central">
                  {node.order}. {(node.title || 'Untitled').slice(0, 18)}
                </text>
              </g>
            )
          })}
          {/* Arrows */}
          {stepsWithDeps.map(step => {
            const targetIdx = nodeIndex.get(step.id)
            if (targetIdx === undefined) return null
            return (step.dependsOn ?? []).map(depId => {
              const srcIdx = nodeIndex.get(depId)
              if (srcIdx === undefined) return null
              const x1 = PAD + COL_W - 8
              const y1 = PAD + srcIdx * ROW_H + ROW_H / 2
              const x2 = PAD + 1
              const y2 = PAD + targetIdx * ROW_H + ROW_H / 2
              const cx1 = x1 + 30
              const cx2 = x2 - 30
              return (
                <path key={`${step.id}-${depId}`}
                  d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                  fill="none" stroke="rgba(45,212,191,0.45)" strokeWidth={1.5}
                  strokeDasharray="4 2"
                  markerEnd="url(#dep-arrow)"
                />
              )
            })
          })}
        </svg>
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
              knownVars={Object.keys(pb.variables ?? {})}
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
