import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import type { PlaybookStep } from '@shared/types'
import StepDetail from './run/StepDetail'
import {
  elapsed,
  VariablesModal, SessionContextBar, ProgressBar,
  StepDotTrack, StepListItem, CompleteRunModal,
} from './run/RunHelpers'

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
  const [paused,    setPaused]      = useState(false)
  const [runElapsed, setRunElapsed] = useState('0:00')
  const [scrollLock, setScrollLock] = useState(true)
  const notesFocusRef = useRef<HTMLTextAreaElement>(null)
  const stepListRef   = useRef<HTMLDivElement>(null)

  // Real-time elapsed timer (improvement 4)
  useEffect(() => {
    if (!activeRun) return
    function tick() {
      if (!activeRun) return
      const ms = Date.now() - new Date(activeRun.startedAt).getTime()
      const m  = Math.floor(ms / 60_000)
      const s  = Math.floor((ms % 60_000) / 1_000)
      setRunElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [activeRun?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-scroll step list to active step when scroll lock is on
  useEffect(() => {
    if (!scrollLock || !stepListRef.current || !selectedStepId) return
    const el = stepListRef.current.querySelector(`[data-step-id="${selectedStepId}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedStepId, scrollLock])

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

  // Estimated completion: avg ms per done step × remaining steps
  const estDoneLabel = (() => {
    const doneSteps = steps.filter(s => s.status === 'done' && (s as { completedAt?: string; startedAt?: string }).completedAt && (s as { startedAt?: string }).startedAt)
    if (doneSteps.length === 0 || done >= total) return null
    const avgMs = doneSteps.reduce((sum, s) => {
      const st = s as { completedAt?: string; startedAt?: string }
      return sum + (new Date(st.completedAt!).getTime() - new Date(st.startedAt!).getTime())
    }, 0) / doneSteps.length
    const remaining = total - done
    const totalMs = avgMs * remaining
    const m = Math.floor(totalMs / 60_000)
    const sec = Math.floor((totalMs % 60_000) / 1_000)
    return `Est. done in ${m}m ${sec}s`
  })()
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
        <div className="flex-shrink-0 flex flex-col" style={{ width: 260, borderRight: '1px solid var(--border)', background: 'var(--panel)' }}>
          {/* Scroll lock toggle */}
          <div
            className="flex items-center justify-between px-2 py-1 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(42,51,71,0.3)', background: 'rgba(7,8,15,0.4)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Steps</span>
            <button
              onClick={() => setScrollLock(l => !l)}
              title={scrollLock ? 'Scroll lock on — click to disable' : 'Scroll lock off — click to enable'}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-all"
              style={{
                background: scrollLock ? 'rgba(74,158,255,0.1)' : 'rgba(42,51,71,0.2)',
                color: scrollLock ? '#2dd4bf' : '#484f58',
                border: `1px solid ${scrollLock ? 'rgba(74,158,255,0.25)' : 'rgba(42,51,71,0.4)'}`,
              }}
            >
              {/* Pin icon */}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 1l3 3-4 4-1-1 1-1-2-2-1 1-1-1 4-4zM4 6L1 9" />
              </svg>
              {scrollLock ? 'lock' : 'free'}
            </button>
          </div>
          <div ref={stepListRef} className="flex-1 overflow-y-auto py-1">
            {steps.map(step => {
              const blocked = isBlocked(step, steps) || skipSet.has(step.id)
              return (
                <div key={step.id} data-step-id={step.id}>
                  <StepListItem step={step} isActive={step.id === selectedStep?.id}
                    isBlocked={blocked} onClick={() => setSelectedStepId(step.id)} />
                </div>
              )
            })}
          </div>
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
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          [{String.fromCharCode(8592)}/{String.fromCharCode(8594)}] nav  [P] pass  [F/S] skip  [N] notes
        </span>
        {/* Elapsed timer */}
        <span
          className="text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1.5 flex-shrink-0"
          style={{ background: 'rgba(74,158,255,0.08)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.2)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: paused ? '#484f58' : '#2dd4bf', animation: paused ? 'none' : 'pulse 2s ease-in-out infinite' }}
          />
          Running for {runElapsed}
        </span>
        {/* Estimated completion */}
        {estDoneLabel && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(210,153,34,0.06)', color: '#d29922', border: '1px solid rgba(210,153,34,0.15)' }}
          >
            {estDoneLabel}
          </span>
        )}
        <div className="flex-1" />
        {activeRun.status === 'completed' && (
          <button onClick={handleExportReport} disabled={exporting} className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: 'rgba(63,185,80,0.15)', color: 'var(--success)', border: '1px solid rgba(63,185,80,0.3)' }}>
            {exporting ? 'Exporting…' : 'Export to Report'}
          </button>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{done}/{total} steps</span>
        {/* Pause/Resume button (visual only) */}
        <button
          onClick={() => setPaused(p => !p)}
          className="text-xs px-3 py-1.5 rounded font-medium flex-shrink-0"
          style={{
            background: 'rgba(42,51,71,0.4)',
            color: '#e2e8f0',
            border: '1px solid rgba(42,51,71,0.6)',
          }}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button onClick={() => setShowModal(true)} className="text-xs px-4 py-1.5 rounded font-semibold"
          style={{ background: done === total ? '#3fb950' : '#4a9eff', color: '#0a0a0f' }}>
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
