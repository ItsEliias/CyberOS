import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import type { PlaybookStep, StepStatus, StepNote, StepType } from '@shared/types'

const STEP_TYPE_BORDER: Record<StepType, string> = {
  action:        '#4a9eff',
  verification:  '#3fb950',
  documentation: '#8b949e',
  command:       '#d29922',
  decision:      '#bc8cff',
}

const STATUS_LABEL: Record<StepStatus, string> = {
  todo: '○ Todo', inprogress: '▶ In Progress', done: '✓ Done', skipped: '↷ Skip',
}
const STATUS_BG: Record<StepStatus, string> = {
  todo: 'rgba(74,158,255,0.15)', inprogress: 'rgba(210,153,34,0.2)', done: 'rgba(63,185,80,0.2)', skipped: 'rgba(139,148,158,0.15)',
}
const STATUS_COLOR: Record<StepStatus, string> = {
  todo: '#4a9eff', inprogress: '#d29922', done: '#3fb950', skipped: '#8b949e',
}

// Highlight {{VAR}} tokens in teal — used for description and command preview
function VarHighlight({ text }: { text: string }) {
  const parts = text.split(/({{[^}]+}})/)
  return (
    <>
      {parts.map((p, i) =>
        /^{{.+}}$/.test(p)
          ? (
            <span
              key={i}
              style={{
                color: '#2dd4bf',
                background: 'rgba(45,212,191,0.10)',
                borderRadius: 3,
                padding: '0 3px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85em',
              }}
            >
              {p}
            </span>
          )
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

function resolveCmd(cmd: string, vars: Record<string, string>, targetIP: string): string {
  let result = cmd
  Object.entries(vars).forEach(([k, v]) => {
    result = result.replaceAll(`{{${k}}}`, v)
  })
  if (targetIP) {
    result = result.replace(/\[TARGET_IP\]/g, targetIP).replace(/<IP>/g, targetIP).replace(/<target>/gi, targetIP)
  }
  return result
}

function fmtDuration(ms: number): string {
  // Negative durations happen when the user's clock jumps backward between
  // startedAt and completedAt, or when bad data ends up in the run JSON.
  // Don't render '-5s' next to the step title.
  if (!Number.isFinite(ms) || ms < 0) return '0s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ─── Command Block ─────────────────────────────────────────────────────────────

function CommandBlock({ cmd, vars, targetIP, playbookTitle, stepTitle }: {
  cmd: string; vars: Record<string, string>; targetIP: string; playbookTitle: string; stepTitle: string
}) {
  const [copied, setCopied] = useState(false)
  const [sent,   setSent]   = useState(false)
  const resolved = resolveCmd(cmd, vars, targetIP)

  async function handleCopy() {
    await navigator.clipboard.writeText(resolved)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  async function handleRun() {
    await window.electronAPI.runCommand({ command: resolved, stepTitle, playbookTitle, source: 'PlaybookStudio', queuedAt: new Date().toISOString() })
    setSent(true); setTimeout(() => setSent(false), 2000)
  }

  const parts = resolved.split(/({{[^}]+}})/)

  return (
    <div className="rounded flex items-start gap-2 px-3 py-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <code className="flex-1 text-xs font-mono break-all" style={{ color: '#e2e8f0' }}>
        {parts.map((p, i) => /^{{.+}}$/.test(p)
          ? <span key={i} style={{ color: '#2dd4bf', background: 'rgba(45,212,191,0.12)', borderRadius: 3, padding: '0 2px' }}>{p}</span>
          : <span key={i}>{p}</span>
        )}
      </code>
      <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
        <button onClick={handleCopy} className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: copied ? 'rgba(63,185,80,0.15)' : 'var(--border)', color: copied ? 'var(--success)' : 'var(--text-muted)' }}>
          {copied ? '✓' : '📋'}
        </button>
        <button onClick={handleRun} className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ color: sent ? 'var(--success)' : 'var(--accent)', border: `1px solid ${sent ? 'rgba(63,185,80,0.3)' : 'rgba(74,158,255,0.3)'}` }}>
          {sent ? '✓' : '▶'}
        </button>
      </div>
    </div>
  )
}

// ─── Evidence Panel ────────────────────────────────────────────────────────────

function EvidencePanel({ evidence, runId, stepId }: { evidence: string[]; runId: string; stepId: string }) {
  const updateRun = useStore(s => s.updateRun)

  async function handleAdd() {
    const res = await window.electronAPI.pickEvidenceFile()
    if (!res.ok || !res.filePath) return
    const updated = await window.electronAPI.updateStep(runId, stepId, { evidence: [...evidence, res.filePath] })
    if (updated.ok && updated.run) updateRun(updated.run)
  }

  async function handleOpen(path: string) {
    await window.electronAPI.openEvidenceFile(path)
  }

  async function handleRemove(path: string) {
    const updated = await window.electronAPI.updateStep(runId, stepId, { evidence: evidence.filter(e => e !== path) })
    if (updated.ok && updated.run) updateRun(updated.run)
  }

  const isImage = (p: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(p)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Evidence</span>
        <button onClick={handleAdd} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          + Attach
        </button>
      </div>
      {evidence.map(path => (
        <div key={path} className="flex items-center gap-2 rounded px-2 py-1.5" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
          {isImage(path) ? (
            <img src={`file://${path}`} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" style={{ cursor: 'pointer' }} onClick={() => handleOpen(path)} />
          ) : (
            <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>📄</span>
          )}
          <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => handleOpen(path)}>
            {path.split('/').pop()}
          </span>
          <button onClick={() => handleRemove(path)} className="text-xs flex-shrink-0" style={{ color: 'var(--error)' }}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Notes Thread ──────────────────────────────────────────────────────────────

function NotesThread({ notes, runId, stepId, focusRef }: {
  notes: StepNote[]; runId: string; stepId: string; focusRef?: React.RefObject<HTMLTextAreaElement>
}) {
  const updateRun = useStore(s => s.updateRun)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(notes.length > 0)

  async function handleAdd() {
    if (!text.trim()) return
    const newNote: StepNote = { id: `note-${Date.now()}`, text: text.trim(), createdAt: new Date().toISOString() }
    const updated = await window.electronAPI.updateStep(runId, stepId, { noteThread: [...notes, newNote] })
    if (updated.ok && updated.run) { updateRun(updated.run); setText('') }
  }

  return (
    <div className="flex flex-col gap-1">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs text-left" style={{ color: 'var(--text-muted)' }}>
        <span className="font-semibold uppercase tracking-wide">Notes Thread</span>
        {notes.length > 0 && <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>{notes.length}</span>}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {notes.map(n => (
            <div key={n.id} className="rounded px-2 py-1.5" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleTimeString()}</div>
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{n.text}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <textarea ref={focusRef} rows={2} className="flex-1 rounded px-2 py-1.5 text-xs resize-none"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Add a note…" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }} />
            <button onClick={handleAdd} className="text-xs px-3 py-1 rounded self-end" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── StepDetail ────────────────────────────────────────────────────────────────

export interface StepDetailProps {
  step: PlaybookStep
  runId: string
  targetIP: string
  playbookTitle: string
  variables: Record<string, string>
  notesFocusRef: React.RefObject<HTMLTextAreaElement>
}

export default function StepDetail({ step, runId, targetIP, playbookTitle, variables, notesFocusRef }: StepDetailProps) {
  const updateRun = useStore(s => s.updateRun)
  const [notes, setNotes] = useState(step.operatorNotes ?? '')
  const status = step.status ?? 'todo'
  const typeColor = STEP_TYPE_BORDER[step.stepType ?? 'action']

  // Mirror the current textarea value into a ref so the step-switch
  // cleanup below can read it without taking a dep on `notes` (which
  // would re-run the effect — and reset the textarea — on every
  // keystroke).
  const notesRef = useRef(notes)
  notesRef.current = notes

  // Sync the quick-note textarea only when the step itself changes
  // (different id). The old deps array included step.operatorNotes, which
  // meant every save round-trip from the store would resync — fine when
  // the values matched, but in flight a peer save could overwrite the
  // user's in-progress keystrokes. Keying solely on step.id keeps local
  // typing sovereign until the user explicitly switches steps.
  //
  // Persist any pending edits on step-switch (cleanup phase) so jumping
  // between steps with the keyboard doesn't silently drop the quick note.
  useEffect(() => {
    const original       = step.operatorNotes ?? ''
    setNotes(original)
    const capturedRunId  = runId
    const capturedStepId = step.id
    return () => {
      const current = notesRef.current
      if (current !== original) {
        window.electronAPI
          .updateStep(capturedRunId, capturedStepId, { operatorNotes: current })
          .then(res => { if (res.ok && res.run) updateRun(res.run) })
          .catch(() => { /* best-effort autosave on step-switch */ })
      }
    }
    // updateRun is stable from zustand; runId/step.operatorNotes intentionally
    // captured-and-frozen for the cleanup snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  async function setStatus(next: StepStatus) {
    if (next === status) return
    if (step.required && next === 'skipped') {
      if (!confirm(`"${step.title}" is a required step. Skip anyway?`)) return
    }
    const now = new Date().toISOString()
    const patch: Partial<PlaybookStep> = { status: next, operatorNotes: notes }
    if (next === 'done' && !step.completedAt) patch.completedAt = now
    if (next === 'inprogress' && !step.startedAt) patch.startedAt = now
    const res = await window.electronAPI.updateStep(runId, step.id, patch)
    if (res.ok && res.run) updateRun(res.run)
  }

  async function saveNotes() {
    const res = await window.electronAPI.updateStep(runId, step.id, { operatorNotes: notes })
    if (res.ok && res.run) updateRun(res.run)
  }

  const durationMs = step.startedAt && step.completedAt
    ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
    : null

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4" style={{ borderLeft: `3px solid ${typeColor}` }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${typeColor}1a`, color: typeColor }}>{step.stepType ?? 'action'}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--panel)', color: 'var(--text-muted)' }}>{step.category}</span>
          {step.required && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(210,153,34,0.12)', color: 'var(--warning)' }}>required</span>}
          {step.mitreTechniqueId && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(188,140,255,0.12)', color: '#bc8cff' }}>
              {step.mitreTechniqueId}{step.mitreTechniqueName ? ` · ${step.mitreTechniqueName}` : ''}
            </span>
          )}
          {durationMs !== null && (
            <span className="text-xs px-1.5 py-0.5 rounded ml-auto" style={{ background: 'var(--panel)', color: 'var(--success)' }}>
              {fmtDuration(durationMs)}
            </span>
          )}
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{step.order}. {step.title}</h2>
        {step.description && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            <VarHighlight text={step.description} />
          </p>
        )}
      </div>

      {/* Commands */}
      {step.commands.filter(Boolean).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Commands</span>
            {targetIP && <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'rgba(74,158,255,0.1)' }}>{targetIP}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            {step.commands.filter(Boolean).map((cmd, i) => (
              <CommandBlock key={i} cmd={cmd} vars={variables} targetIP={targetIP} playbookTitle={playbookTitle} stepTitle={step.title} />
            ))}
          </div>
        </div>
      )}

      {/* Guidance */}
      {step.notes && (
        <div className="rounded px-3 py-2.5" style={{ background: 'rgba(74,158,255,0.06)', border: '1px solid rgba(74,158,255,0.15)' }}>
          <span className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--accent)' }}>Guidance</span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>{step.notes}</p>
        </div>
      )}

      {/* Operator notes (legacy single note) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Quick Note</label>
        <textarea rows={3} className="w-full rounded px-2.5 py-2 text-xs"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
          placeholder="Add your findings here…" value={notes}
          onChange={e => setNotes(e.target.value)} onBlur={saveNotes} />
      </div>

      {/* Collaborative notes thread */}
      <NotesThread notes={step.noteThread ?? []} runId={runId} stepId={step.id} focusRef={notesFocusRef} />

      {/* Evidence */}
      <EvidencePanel evidence={step.evidence ?? []} runId={runId} stepId={step.id} />

      {/* Decision branches */}
      {step.stepType === 'decision' && (
        <div className="flex gap-2 rounded p-2" style={{ background: 'rgba(188,140,255,0.08)', border: '1px solid rgba(188,140,255,0.2)' }}>
          <span className="text-xs" style={{ color: '#bc8cff' }}>Decision step: mark Pass (Done) or Fail (Skip) to branch.</span>
        </div>
      )}

      {/* Status buttons */}
      <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {(['todo', 'inprogress', 'done', 'skipped'] as StepStatus[]).map(s => {
          const isActive = status === s
          return (
            <button key={s} onClick={() => setStatus(s)}
              className="flex-1 text-xs py-1.5 rounded font-medium"
              style={{ background: isActive ? STATUS_BG[s] : 'var(--border)', color: isActive ? STATUS_COLOR[s] : 'var(--text-muted)', border: isActive ? `1px solid ${STATUS_COLOR[s]}40` : '1px solid transparent' }}>
              {STATUS_LABEL[s]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
