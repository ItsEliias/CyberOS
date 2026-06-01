import { useState } from 'react'
import { useStore } from '../store'
import type { PlaybookRun, StepStatus } from '@shared/types'

const STATUS_COLOR: Record<PlaybookRun['status'], string> = {
  running:   'var(--warning)',
  completed: 'var(--success)',
  abandoned: 'var(--error)',
}

const STEP_STATUS_COLOR: Record<StepStatus, string> = {
  todo:       'var(--text-muted)',
  inprogress: 'var(--warning)',
  done:       'var(--success)',
  skipped:    'var(--text-dim)',
}

function RunDetail({ run }: { run: PlaybookRun }) {
  const done    = run.steps.filter(s => s.status === 'done').length
  const skipped = run.steps.filter(s => s.status === 'skipped').length

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div
        className="rounded-lg px-4 py-3 flex flex-wrap gap-4"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Playbook</div>
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{run.playbookName}</div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Status</div>
          <div className="text-sm font-medium" style={{ color: STATUS_COLOR[run.status] }}>{run.status}</div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Started</div>
          <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
            {new Date(run.startedAt).toLocaleString()}
          </div>
        </div>
        {run.completedAt && (
          <div>
            <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Completed</div>
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
              {new Date(run.completedAt).toLocaleString()}
            </div>
          </div>
        )}
        {run.labName && (
          <div>
            <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Lab</div>
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>{run.labName}</div>
          </div>
        )}
        {run.targetName && (
          <div>
            <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Target</div>
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>{run.targetName}</div>
          </div>
        )}
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Progress</div>
          <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
            {done} done, {skipped} skipped / {run.steps.length} total
          </div>
        </div>
      </div>

      {/* Step summary */}
      <div className="flex flex-col gap-1.5">
        {run.steps.map(step => (
          <div
            key={step.id}
            className="rounded px-3 py-2"
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              opacity: step.status === 'skipped' ? 0.55 : 1,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {String(step.order).padStart(2, '0')}
              </span>
              <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{step.title}</span>
              <span
                className="text-xs font-medium flex-shrink-0"
                style={{ color: STEP_STATUS_COLOR[step.status ?? 'todo'] }}
              >
                {step.status ?? 'todo'}
              </span>
              {step.completedAt && (
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {new Date(step.completedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            {step.operatorNotes && (
              <p
                className="text-xs mt-1 pl-6"
                style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}
              >
                {step.operatorNotes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryView() {
  const runs            = useStore(s => s.runs)
  const setActiveRun    = useStore(s => s.setActiveRun)
  const setView         = useStore(s => s.setView)
  const [selected, setSelected] = useState<PlaybookRun | null>(null)

  function handleResume(run: PlaybookRun) {
    setActiveRun(run)
    setView('run')
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm mb-1" style={{ color: 'var(--text-dim)' }}>No runs yet.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Run a playbook from the Library to get started.</p>
        </div>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <div
          className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}
        >
          <button
            onClick={() => setSelected(null)}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ background: 'var(--border)', color: 'var(--text-dim)' }}
          >
            ← History
          </button>
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
            {selected.playbookName}
          </span>
          {selected.status === 'running' && (
            <button
              onClick={() => handleResume(selected)}
              className="text-xs px-3 py-1 rounded font-medium"
              style={{ background: 'var(--warning)', color: '#000' }}
            >
              Resume
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <RunDetail run={selected} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          Run History ({runs.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {runs.map(run => {
          const done  = run.steps.filter(s => s.status === 'done').length
          const total = run.steps.length
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <button
              key={run.id}
              onClick={() => setSelected(run)}
              className="w-full text-left rounded-lg px-4 py-3 transition-colors"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {run.playbookName}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
                      style={{ color: STATUS_COLOR[run.status], background: `${STATUS_COLOR[run.status]}22` }}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    {run.targetName && <span>Target: {run.targetName}</span>}
                    {run.labName    && <span>Lab: {run.labName}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                    {done}/{total}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct}%</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
