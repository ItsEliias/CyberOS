import { useState } from 'react'
import { useStore } from '../store'
import type { PlaybookStep, StepStatus } from '@shared/types'

const STATUS_COLORS: Record<StepStatus, string> = {
  todo:       'var(--text-muted)',
  inprogress: 'var(--warning)',
  done:       'var(--success)',
  skipped:    'var(--text-dim)',
}

const STATUS_BG: Record<StepStatus, string> = {
  todo:       'transparent',
  inprogress: 'rgba(210,153,34,0.1)',
  done:       'rgba(63,185,80,0.1)',
  skipped:    'var(--bg)',
}

function nextStatus(current: StepStatus): StepStatus {
  if (current === 'todo')       return 'inprogress'
  if (current === 'inprogress') return 'done'
  return current
}

function StepCard({
  step, runId, isActive,
}: {
  step: PlaybookStep
  runId: string
  isActive: boolean
}) {
  const updateRun   = useStore(s => s.updateRun)
  const [expanded, setExpanded] = useState(isActive)
  const [notes, setNotes] = useState(step.operatorNotes ?? '')
  const status = step.status ?? 'todo'

  async function advanceStatus() {
    const next = nextStatus(status)
    if (next === status) return
    const now = next === 'done' ? new Date().toISOString() : undefined
    const res = await window.electronAPI.updateStep(runId, step.id, {
      status: next,
      ...(now && { completedAt: now }),
      operatorNotes: notes,
    })
    if (res.ok && res.run) updateRun(res.run)
  }

  async function skip() {
    const res = await window.electronAPI.updateStep(runId, step.id, {
      status: 'skipped',
      operatorNotes: notes,
    })
    if (res.ok && res.run) updateRun(res.run)
  }

  async function saveNotes() {
    const res = await window.electronAPI.updateStep(runId, step.id, { operatorNotes: notes })
    if (res.ok && res.run) updateRun(res.run)
  }

  async function copyCmd(cmd: string) {
    await navigator.clipboard.writeText(cmd)
  }

  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{
        border: `1px solid ${status !== 'todo' ? STATUS_COLORS[status] : 'var(--border)'}`,
        background: STATUS_BG[status],
        opacity: status === 'skipped' ? 0.55 : 1,
      }}
    >
      {/* Step header */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <button
          onClick={e => { e.stopPropagation(); advanceStatus() }}
          className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: STATUS_COLORS[status],
            background:  status === 'done' ? 'var(--success)' : status === 'inprogress' ? 'rgba(210,153,34,0.3)' : 'transparent',
          }}
          title="Click to advance status"
        >
          {status === 'done' && <span className="text-white text-xs leading-none">✓</span>}
          {status === 'inprogress' && <span className="text-xs leading-none" style={{ color: 'var(--warning)' }}>…</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-xs flex-shrink-0"
              style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
            >
              {String(step.order).padStart(2, '0')}
            </span>
            <span
              className="text-sm font-medium truncate"
              style={{ color: status === 'done' ? 'var(--success)' : 'var(--text)' }}
            >
              {step.title}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: 'var(--panel)', color: 'var(--text-muted)' }}
            >
              {step.category}
            </span>
            {step.required && status === 'todo' && (
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--warning)' }}>required</span>
            )}
          </div>
        </div>

        <span
          className="text-xs flex-shrink-0 font-medium"
          style={{ color: STATUS_COLORS[status] }}
        >
          {status}
        </span>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          {step.description && (
            <p className="text-sm mt-3" style={{ color: 'var(--text-dim)' }}>{step.description}</p>
          )}

          {step.commands.filter(Boolean).length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Commands</span>
              {step.commands.filter(Boolean).map((cmd, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded px-2 py-1.5"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <code className="text-xs flex-1 font-mono" style={{ color: 'var(--accent)' }}>{cmd}</code>
                  <button
                    onClick={() => copyCmd(cmd)}
                    className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded transition-colors"
                    style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                    title="Copy to clipboard"
                  >
                    copy
                  </button>
                </div>
              ))}
            </div>
          )}

          {step.notes && (
            <div className="rounded px-3 py-2" style={{ background: 'rgba(74,158,255,0.08)', border: '1px solid var(--accent-dim)' }}>
              <span className="text-xs block mb-1" style={{ color: 'var(--accent)' }}>Guidance</span>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{step.notes}</p>
            </div>
          )}

          <div>
            <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Operator Notes</span>
            <textarea
              rows={3}
              className="w-full rounded px-2 py-1.5 text-sm"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Notes for this step…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            {status !== 'skipped' && status !== 'done' && (
              <button
                onClick={skip}
                className="text-xs px-2.5 py-1 rounded transition-colors"
                style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
              >
                Skip
              </button>
            )}
            {status === 'todo' && (
              <button
                onClick={advanceStatus}
                className="text-xs px-3 py-1 rounded font-medium transition-colors"
                style={{ background: 'var(--warning)', color: '#000' }}
              >
                Start Step
              </button>
            )}
            {status === 'inprogress' && (
              <button
                onClick={advanceStatus}
                className="text-xs px-3 py-1 rounded font-medium transition-colors"
                style={{ background: 'var(--success)', color: '#000' }}
              >
                Mark Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RunView() {
  const activeRun  = useStore(s => s.activeRun)
  const setActiveRun = useStore(s => s.setActiveRun)
  const updateRun  = useStore(s => s.updateRun)
  const setView    = useStore(s => s.setView)
  const context    = useStore(s => s.context)

  if (!activeRun) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: 'var(--text-dim)' }}>No active run.</p>
          <button
            onClick={() => setView('library')}
            className="text-xs px-3 py-1.5 rounded"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Go to Library
          </button>
        </div>
      </div>
    )
  }

  const steps  = activeRun.steps
  const done   = steps.filter(s => s.status === 'done' || s.status === 'skipped').length
  const total  = steps.length
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleComplete() {
    if (!confirm('Mark this run as complete?')) return
    const res = await window.electronAPI.completeRun(activeRun!.id)
    if (res.ok && res.run) {
      updateRun(res.run)
      setActiveRun(null)
      setView('history')
    }
  }

  async function handleAbandon() {
    if (!confirm('Abandon this run? Progress will be saved in history.')) return
    const res = await window.electronAPI.abandonRun(activeRun!.id)
    if (res.ok && res.run) {
      updateRun(res.run)
      setActiveRun(null)
      setView('library')
    }
  }

  const lab    = activeRun.labName    ?? context.activeLab
  const target = activeRun.targetName ?? context.activeTarget ?? context.activeIP

  return (
    <div className="flex flex-col h-full">
      {/* Run header */}
      <div
        className="flex-shrink-0 px-4 py-3 flex flex-col gap-2"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}
      >
        {/* Context banner */}
        {(lab || target) && (
          <div
            className="text-xs px-3 py-1.5 rounded flex items-center gap-2"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <span style={{ color: 'var(--text-dim)' }}>Running for:</span>
            {lab    && <span className="font-medium">{lab}</span>}
            {target && <><span style={{ color: 'var(--text-dim)' }}>—</span><span>Target: {target}</span></>}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{activeRun.playbookName}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Started {new Date(activeRun.startedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
              {done}/{total} steps
            </span>
            <button
              onClick={handleAbandon}
              className="text-xs px-2.5 py-1 rounded transition-colors"
              style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
            >
              Abandon
            </button>
            <button
              onClick={handleComplete}
              className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{ background: pct === 100 ? 'var(--success)' : 'var(--accent)', color: pct === 100 ? '#000' : '#fff' }}
            >
              Complete Playbook
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-full h-1.5 w-full" style={{ background: 'var(--border)' }}>
          <div
            className="rounded-full h-1.5 transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            runId={activeRun.id}
            isActive={idx === 0 && step.status === 'todo'}
          />
        ))}
      </div>
    </div>
  )
}
