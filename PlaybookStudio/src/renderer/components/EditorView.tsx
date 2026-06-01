import { useState, useCallback } from 'react'
import { useStore } from '../store'
import type { Playbook, PlaybookStep, StepCategory, PlaybookCategory } from '@shared/types'

const STEP_CATS: StepCategory[] = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot', 'report']
const PB_CATS: PlaybookCategory[] = ['web-app', 'network', 'active-directory', 'linux', 'windows', 'ctf', 'custom']

function uid() { return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function StepEditor({
  step, index, total,
  onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: {
  step: PlaybookStep
  index: number
  total: number
  onChange: (s: PlaybookStep) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-lg"
      style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
    >
      {/* Step header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span
          className="text-xs w-5 h-5 rounded flex items-center justify-center font-mono flex-shrink-0"
          style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
        >
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {step.title || <span style={{ color: 'var(--text-muted)' }}>Untitled step</span>}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: 'var(--panel)', color: 'var(--text-dim)' }}
        >
          {step.category}
        </span>
        {step.required && (
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--warning)' }}>required</span>
        )}
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Title</label>
              <input
                className="w-full rounded px-2 py-1 text-sm"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={step.title}
                onChange={e => onChange({ ...step, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
              <select
                className="rounded px-2 py-1 text-sm"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={step.category}
                onChange={e => onChange({ ...step, category: e.target.value as StepCategory })}
              >
                {STEP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea
              rows={2}
              className="w-full rounded px-2 py-1 text-sm"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={step.description}
              onChange={e => onChange({ ...step, description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>
              Commands (one per line)
            </label>
            <textarea
              rows={3}
              className="w-full rounded px-2 py-1 text-xs font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={step.commands.join('\n')}
              onChange={e => onChange({ ...step, commands: e.target.value.split('\n') })}
            />
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
            <textarea
              rows={2}
              className="w-full rounded px-2 py-1 text-sm"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={step.notes}
              onChange={e => onChange({ ...step, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-dim)' }}>
              <input
                type="checkbox"
                checked={step.required}
                onChange={e => onChange({ ...step, required: e.target.checked })}
              />
              Required step
            </label>
            <div className="flex items-center gap-1">
              <button onClick={onMoveUp}   disabled={index === 0}     className="text-xs px-1.5 py-1 rounded transition-colors" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>↑</button>
              <button onClick={onMoveDown} disabled={index === total - 1} className="text-xs px-1.5 py-1 rounded transition-colors" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>↓</button>
              <button onClick={onDuplicate} className="text-xs px-2 py-1 rounded transition-colors" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Duplicate</button>
              <button onClick={onDelete}    className="text-xs px-2 py-1 rounded transition-colors" style={{ background: 'rgba(248,81,73,0.15)', color: 'var(--error)' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EditorView() {
  const activePlaybook  = useStore(s => s.activePlaybook)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setPlaybooks    = useStore(s => s.setPlaybooks)
  const setView         = useStore(s => s.setView)

  const [pb, setPb] = useState<Playbook>(() => activePlaybook ?? {
    id: `custom-${Date.now()}`,
    name: '',
    description: '',
    category: 'custom',
    tags: [],
    version: '1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [],
    isBuiltIn: false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

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
    const newStep: PlaybookStep = {
      id: uid(),
      order: pb.steps.length + 1,
      title: '',
      description: '',
      category: 'recon',
      commands: [],
      notes: '',
      required: false,
    }
    setPb(p => ({ ...p, steps: [...p.steps, newStep] }))
  }

  async function handleSave() {
    if (!pb.name.trim()) { setError('Playbook name is required.'); return }
    setSaving(true)
    setError('')
    const res = await window.electronAPI.savePlaybook(pb)
    if (res.ok && res.playbook) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
      setActivePlaybook(res.playbook)
      setPb(res.playbook)
    } else {
      setError(res.error ?? 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}
      >
        <button
          onClick={() => setView('library')}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
        >
          ← Library
        </button>
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
          {pb.isBuiltIn ? `${pb.name} (view only)` : (pb.name || 'Untitled Playbook')}
        </span>
        {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}
        {!pb.isBuiltIn && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Metadata */}
        <div
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={pb.name}
                disabled={pb.isBuiltIn}
                onChange={e => setPb(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
              <select
                className="rounded px-2 py-1.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={pb.category}
                disabled={pb.isBuiltIn}
                onChange={e => setPb(p => ({ ...p, category: e.target.value as PlaybookCategory }))}
              >
                {PB_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Version</label>
              <input
                className="w-20 rounded px-2 py-1.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                value={pb.version}
                disabled={pb.isBuiltIn}
                onChange={e => setPb(p => ({ ...p, version: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea
              rows={2}
              className="w-full rounded px-2 py-1.5 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={pb.description}
              disabled={pb.isBuiltIn}
              onChange={e => setPb(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Tags (comma-separated)</label>
            <input
              className="w-full rounded px-2 py-1.5 text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              value={pb.tags.join(', ')}
              disabled={pb.isBuiltIn}
              onChange={e => setPb(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Steps ({pb.steps.length})
          </span>
          {!pb.isBuiltIn && (
            <button
              onClick={addStep}
              className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              + Add Step
            </button>
          )}
        </div>

        {pb.steps.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No steps yet.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {pb.steps.map((step, idx) => (
            <StepEditor
              key={step.id}
              step={step}
              index={idx}
              total={pb.steps.length}
              onChange={s => updateStep(idx, s)}
              onDelete={() => deleteStep(idx)}
              onDuplicate={() => duplicateStep(idx)}
              onMoveUp={() => moveStep(idx, -1)}
              onMoveDown={() => moveStep(idx, 1)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
