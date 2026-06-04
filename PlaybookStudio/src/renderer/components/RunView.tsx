import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import type { PlaybookStep, StepStatus, StepType } from '@shared/types'
import StepDetail from './run/StepDetail'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const h  = Math.floor(ms / 3_600_000)
  const m  = Math.floor((ms % 3_600_000) / 60_000)
  const s  = Math.floor((ms % 60_000) / 1_000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtMs(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const STEP_TYPE_BORDER: Record<StepType, string> = {
  action: '#4a9eff', verification: '#3fb950', documentation: '#8b949e', command: '#d29922', decision: '#bc8cff',
}

// ─── Variables Prompt Modal ────────────────────────────────────────────────────

function VariablesModal({ vars, onConfirm, onCancel }: {
  vars: Record<string, string>
  onConfirm: (filled: Record<string, string>) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(vars)
  const empty = Object.entries(values).filter(([, v]) => !v.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ width: 420, background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Fill Variables</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>These values will be substituted in commands during this run.</p>
        </div>
        <div className="flex flex-col gap-2">
          {Object.entries(values).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs font-mono flex-shrink-0 w-28 px-1.5 py-0.5 rounded text-right" style={{ background: 'rgba(74,158,255,0.1)', color: '#4a9eff' }}>
                {'{{'}{k}{'}}'}
              </span>
              <input className="flex-1 rounded px-2 py-1 text-xs font-mono"
                style={{ background: 'var(--bg)', border: `1px solid ${v.trim() ? 'var(--border)' : 'rgba(248,81,73,0.4)'}`, color: 'var(--text)' }}
                value={v} placeholder="required" autoFocus={!v}
                onChange={e => setValues(prev => ({ ...prev, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        {empty.length > 0 && (
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            {empty.length} variable{empty.length !== 1 ? 's' : ''} unfilled. You can still proceed.
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs py-2 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Cancel</button>
          <button onClick={() => onConfirm(values)} className="flex-1 text-xs py-2 rounded font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
            Start Run
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Session Context Bar ───────────────────────────────────────────────────────

function SessionContextBar({ lab, target, targetIP, startedAt }: {
  lab?: string; target?: string; targetIP?: string; startedAt: string
}) {
  const [elap, setElap] = useState(() => elapsed(startedAt))
  useEffect(() => {
    const t = setInterval(() => setElap(elapsed(startedAt)), 1000)
    return () => clearInterval(t)
  }, [startedAt])
  if (!lab && !target && !targetIP) return null
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 text-xs flex-shrink-0"
      style={{ background: 'rgba(74,158,255,0.06)', borderBottom: '1px solid rgba(74,158,255,0.15)' }}>
      {lab && <span style={{ color: 'var(--text-dim)' }}>Lab: <span className="font-medium" style={{ color: 'var(--accent)' }}>{lab}</span></span>}
      {target && <span style={{ color: 'var(--text-dim)' }}>Target: <span style={{ color: 'var(--text)' }}>{target}</span></span>}
      {targetIP && <span className="font-mono" style={{ color: 'var(--accent)' }}>{targetIP}</span>}
      <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)' }}>Elapsed: {elap}</span>
    </div>
  )
}

// ─── Progress Bar with ETA ────────────────────────────────────────────────────

function ProgressBar({ done, total, runs, playbookId }: { done: number; total: number; runs: import('@shared/types').PlaybookRun[]; playbookId: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const eta = (() => {
    const pastRuns = runs.filter(r => r.playbookId === playbookId && r.status === 'completed' && r.completedAt)
    if (pastRuns.length === 0 || done === 0) return null
    const avgStepMs = pastRuns.reduce((sum, r) => {
      const dur = new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime()
      return sum + dur / r.steps.length
    }, 0) / pastRuns.length
    const remaining = total - done
    const etaMs = remaining * avgStepMs
    return etaMs > 0 ? fmtMs(etaMs) : null
  })()

  return (
    <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span style={{ color: 'var(--text-muted)' }}>Progress</span>
        <div className="flex items-center gap-3">
          {eta && <span style={{ color: 'var(--text-muted)' }}>ETA: ~{eta} remaining</span>}
          <span style={{ color: pct === 100 ? 'var(--success)' : 'var(--text-dim)' }}>
            {done} of {total} ({pct}%)
          </span>
        </div>
      </div>
      <div className="rounded-full h-1.5 w-full overflow-hidden" style={{ background: 'rgba(42,51,71,0.5)' }}>
        <div
          className="rounded-full h-1.5 relative overflow-hidden"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, #3fb950, #58c464)'
              : 'linear-gradient(90deg, #2dd4bf, #5ee7d6)',
            transition: 'width 600ms cubic-bezier(0.2,0.8,0.2,1)',
          }}
        >
          {pct > 0 && pct < 100 && (
            <span
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                animation: 'shimmerSlide 1.8s linear infinite',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step Dot Track ────────────────────────────────────────────────────────────

function StepDotTrack({ steps, activeId }: { steps: PlaybookStep[]; activeId: string | null }) {
  if (steps.length === 0 || steps.length > 30) return null
  return (
    <div
      className="flex items-center gap-1 px-4 py-2 flex-shrink-0 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border)', background: 'rgba(13,14,24,0.6)' }}
    >
      {steps.map((step, i) => {
        const status = step.status ?? 'todo'
        const isActive = step.id === activeId

        let dotColor = 'rgba(42,51,71,0.6)'
        let dotBg    = 'transparent'
        if (status === 'done')        { dotColor = 'var(--success)'; dotBg = 'rgba(63,185,80,0.18)' }
        else if (status === 'skipped'){ dotColor = 'var(--text-muted)'; dotBg = 'rgba(72,79,88,0.18)' }
        else if (status === 'inprogress'){ dotColor = 'var(--accent)'; dotBg = 'rgba(45,212,191,0.15)' }
        else if (isActive)            { dotColor = 'var(--accent)'; dotBg = 'rgba(45,212,191,0.10)' }

        return (
          <div key={step.id} className="flex items-center">
            <div
              className="step-dot-pop flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-mono font-semibold"
              style={{
                width: isActive ? 20 : 16,
                height: isActive ? 20 : 16,
                background: dotBg,
                border: `1px solid ${dotColor}`,
                color: dotColor,
                transition: 'all 200ms ease',
                boxShadow: isActive ? `0 0 0 2px rgba(45,212,191,0.18)` : 'none',
              }}
              title={`${step.order}. ${step.title}`}
            >
              {status === 'done' ? '✓' : status === 'skipped' ? '↷' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-shrink-0"
                style={{
                  width: 8,
                  height: 1,
                  background: status === 'done' ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.4)',
                  margin: '0 1px',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step List Item ────────────────────────────────────────────────────────────

function StepListItem({ step, isActive, isBlocked, onClick }: {
  step: PlaybookStep; isActive: boolean; isBlocked: boolean; onClick: () => void
}) {
  const status = step.status ?? 'todo'
  const typeColor = STEP_TYPE_BORDER[step.stepType ?? 'action']

  function icon() {
    if (status === 'done')       return <span style={{ color: 'var(--success)' }}>✓</span>
    if (status === 'inprogress') return <span className="animate-pulse" style={{ color: 'var(--accent)' }}>▶</span>
    if (status === 'skipped')    return <span style={{ color: 'var(--text-muted)' }}>↷</span>
    if (isBlocked)               return <span style={{ color: 'var(--error)' }}>⊘</span>
    return <span style={{ color: 'var(--text-muted)' }}>○</span>
  }

  return (
    <button onClick={onClick} disabled={isBlocked}
      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs"
      style={{
        background: isActive ? 'rgba(74,158,255,0.1)' : 'transparent',
        borderLeft: `3px solid ${isActive ? typeColor : 'transparent'}`,
        color: status === 'done' ? 'var(--success)' : status === 'skipped' ? 'var(--text-muted)' : isBlocked ? 'var(--text-muted)' : 'var(--text-dim)',
        opacity: isBlocked ? 0.45 : 1,
        textDecoration: status === 'skipped' ? 'line-through' : 'none',
      }}>
      <span className="w-4 flex-shrink-0 text-center">{icon()}</span>
      <span className="flex-shrink-0 font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>{step.order}.</span>
      <span className="flex-1 truncate">{step.title}</span>
      {step.required && (status === 'todo' || status === 'inprogress') && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)' }} />
      )}
    </button>
  )
}

// ─── Complete Run Modal ────────────────────────────────────────────────────────

function CompleteRunModal({ playbookName, steps, startedAt, onConfirm, onAbandon, onCancel }: {
  playbookName: string; steps: PlaybookStep[]; startedAt: string
  onConfirm: () => void; onAbandon: () => void; onCancel: () => void
}) {
  const done     = steps.filter(s => s.status === 'done').length
  const skipped  = steps.filter(s => s.status === 'skipped').length
  const todo     = steps.filter(s => !s.status || s.status === 'todo' || s.status === 'inprogress').length
  const required = steps.filter(s => s.required && s.status !== 'done' && s.status !== 'skipped')
  const dur      = elapsed(startedAt)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-xl p-6 flex flex-col gap-5" style={{ width: 380, background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Complete Run</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{playbookName}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {[['Done', `${done} steps`, 'var(--success)'], ['Skipped', `${skipped} steps`, 'var(--text-dim)'], ['Remaining', `${todo} steps`, todo > 0 ? 'var(--warning)' : 'var(--text-muted)'], ['Duration', dur, 'var(--text-dim)']].map(([l, v, c]) => (
            <div key={l as string} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</span>
              <span className="text-xs font-medium" style={{ color: c as string }}>{v}</span>
            </div>
          ))}
        </div>
        {required.length > 0 && (
          <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.2)', color: 'var(--warning)' }}>
            ⚠ {required.length} required step{required.length !== 1 ? 's' : ''} not completed: {required.map(s => s.title).join(', ')}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={onAbandon} className="flex-1 text-xs py-2 rounded" style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--error)', border: '1px solid rgba(248,81,73,0.2)' }}>Abandon</button>
          <button onClick={onCancel}  className="flex-1 text-xs py-2 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 text-xs py-2 rounded font-semibold" style={{ background: 'var(--success)', color: '#000' }}>Mark Complete</button>
        </div>
      </div>
    </div>
  )
}

// ─── RunView ──────────────────────────────────────────────────────────────────

export default function RunView() {
  const activeRun    = useStore(s => s.activeRun)
  const setActiveRun = useStore(s => s.setActiveRun)
  const updateRun    = useStore(s => s.updateRun)
  const setView      = useStore(s => s.setView)
  const context      = useStore(s => s.context)
  const runs         = useStore(s => s.runs)
  const playbooks    = useStore(s => s.playbooks)

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [exporting, setExporting]   = useState(false)
  const notesFocusRef = useRef<HTMLTextAreaElement>(null)

  // Determine if a step is blocked by unmet dependencies
  const isBlocked = useCallback((step: PlaybookStep, steps: PlaybookStep[]) => {
    if (!step.dependsOn?.length) return false
    return step.dependsOn.some(depId => {
      const dep = steps.find(s => s.id === depId)
      return !dep || (dep.status !== 'done' && dep.status !== 'skipped')
    })
  }, [])

  // Evaluate conditions and build skip set
  const skippedByCondition = useCallback((steps: PlaybookStep[], vars: Record<string, string>) => {
    const skipSet = new Set<string>()
    for (const step of steps) {
      if (!step.condition) continue
      const { variableKey, operator, value, skipStepIds } = step.condition
      const actual = vars[variableKey] ?? ''
      const passes = operator === 'equals' ? actual === value
        : operator === 'not_equals' ? actual !== value
        : actual.includes(value)
      if (!passes) skipStepIds.forEach(id => skipSet.add(id))
    }
    return skipSet
  }, [])

  // Auto-select first non-done step
  useEffect(() => {
    if (!activeRun || selectedStepId) return
    const first = activeRun.steps.find(s => s.status !== 'done' && s.status !== 'skipped') ?? activeRun.steps[0]
    if (first) setSelectedStepId(first.id)
  }, [activeRun?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts (Feature 15)
  useEffect(() => {
    if (!activeRun) return
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const steps = useStore.getState().activeRun?.steps ?? []
      const curIdx = steps.findIndex(s => s.id === selectedStepId)

      if ((e.key === 'ArrowRight' || e.key === ']') && curIdx < steps.length - 1) {
        setSelectedStepId(steps[curIdx + 1].id)
      } else if ((e.key === 'ArrowLeft' || e.key === '[') && curIdx > 0) {
        setSelectedStepId(steps[curIdx - 1].id)
      } else if (e.key === 'n' || e.key === 'N') {
        notesFocusRef.current?.focus()
      } else if ((e.key === 'p' || e.key === 'P') && selectedStepId) {
        const step = steps.find(s => s.id === selectedStepId)
        if (step) {
          const now = new Date().toISOString()
          window.electronAPI.updateStep(activeRun.id, selectedStepId, { status: 'done', completedAt: now })
            .then(res => { if (res.ok && res.run) updateRun(res.run) })
        }
      } else if ((e.key === 'f' || e.key === 'F') && selectedStepId) {
        window.electronAPI.updateStep(activeRun.id, selectedStepId, { status: 'skipped' })
          .then(res => { if (res.ok && res.run) updateRun(res.run) })
      } else if ((e.key === 's' || e.key === 'S') && selectedStepId) {
        window.electronAPI.updateStep(activeRun.id, selectedStepId, { status: 'skipped' })
          .then(res => { if (res.ok && res.run) updateRun(res.run) })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeRun, selectedStepId, updateRun])

  if (!activeRun) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>No active run.</p>
          <button onClick={() => setView('library')} className="text-xs px-3 py-1.5 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>
            Go to Library
          </button>
        </div>
      </div>
    )
  }

  const steps     = activeRun.steps
  const vars      = activeRun.variables ?? {}
  const done      = steps.filter(s => s.status === 'done' || s.status === 'skipped').length
  const total     = steps.length
  const lab       = activeRun.labName    ?? context.activeLab
  const target    = activeRun.targetName ?? context.activeTarget
  const targetIP  = context.activeIP ?? ''
  const skipSet   = skippedByCondition(steps, vars)
  const selectedStep = steps.find(s => s.id === selectedStepId) ?? steps[0] ?? null

  async function handleComplete() {
    const res = await window.electronAPI.completeRun(activeRun!.id)
    if (res.ok && res.run) {
      updateRun(res.run); setActiveRun(null); setShowModal(false); setView('history')
    }
  }

  async function handleAbandon() {
    const res = await window.electronAPI.abandonRun(activeRun!.id)
    if (res.ok && res.run) {
      updateRun(res.run); setActiveRun(null); setShowModal(false); setView('library')
    }
  }

  async function handleExportReport() {
    setExporting(true)
    await window.electronAPI.exportRunReport(activeRun!.id)
    setExporting(false)
  }

  const playbookForVars = playbooks.find(p => p.id === activeRun.playbookId)
  const hasVars = Object.keys(playbookForVars?.variables ?? {}).length > 0

  return (
    <div className="flex flex-col h-full">
      <SessionContextBar lab={lab} target={target} targetIP={targetIP} startedAt={activeRun.startedAt} />
      <ProgressBar done={done} total={total} runs={runs} playbookId={activeRun.playbookId} />
      <StepDotTrack steps={steps} activeId={selectedStepId} />

      <div className="flex flex-1 min-h-0">
        {/* Step list */}
        <div className="flex-shrink-0 overflow-y-auto flex flex-col py-1" style={{ width: 260, borderRight: '1px solid var(--border)', background: 'var(--panel)' }}>
          {steps.map(step => {
            const blocked = isBlocked(step, steps) || skipSet.has(step.id)
            return (
              <StepListItem key={step.id} step={step} isActive={step.id === selectedStep?.id}
                isBlocked={blocked} onClick={() => setSelectedStepId(step.id)} />
            )
          })}
        </div>

        {/* Step detail */}
        <div className="flex-1 min-w-0">
          {selectedStep ? (
            <StepDetail key={selectedStep.id} step={selectedStep} runId={activeRun.id}
              targetIP={targetIP} playbookTitle={activeRun.playbookName}
              variables={vars} notesFocusRef={notesFocusRef} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a step.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--panel)' }}>
        <span className="text-xs mr-auto" style={{ color: 'var(--text-muted)' }}>
          [{String.fromCharCode(8592)}/{String.fromCharCode(8594)}] nav  [P] pass  [F/S] skip  [N] notes
        </span>
        {activeRun.status === 'completed' && (
          <button onClick={handleExportReport} disabled={exporting} className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: 'rgba(63,185,80,0.15)', color: 'var(--success)', border: '1px solid rgba(63,185,80,0.3)' }}>
            {exporting ? 'Exporting…' : 'Export to Report'}
          </button>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{done}/{total} steps</span>
        <button onClick={() => setShowModal(true)} className="text-xs px-4 py-1.5 rounded font-semibold"
          style={{ background: done === total ? 'var(--success)' : 'var(--accent)', color: done === total ? '#000' : '#fff' }}>
          {done === total ? '✓ Complete Run' : 'End Run'}
        </button>
      </div>

      {showModal && (
        <CompleteRunModal playbookName={activeRun.playbookName} steps={steps} startedAt={activeRun.startedAt}
          onConfirm={handleComplete} onAbandon={handleAbandon} onCancel={() => setShowModal(false)} />
      )}
    </div>
  )
}

// ─── Variables Start Modal (shown from LibraryView before starting a run) ──────

export function VariablesStartModal({ playbookId, onConfirm, onCancel }: {
  playbookId: string; onConfirm: (vars: Record<string, string>) => void; onCancel: () => void
}) {
  const playbooks = useStore(s => s.playbooks)
  const pb = playbooks.find(p => p.id === playbookId)
  const vars = pb?.variables ?? {}
  if (Object.keys(vars).length === 0) { onConfirm({}); return null }
  return <VariablesModal vars={vars} onConfirm={onConfirm} onCancel={onCancel} />
}
