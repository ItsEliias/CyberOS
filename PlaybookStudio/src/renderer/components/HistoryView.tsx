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

function fmtDuration(ms: number): string {
  if (ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function runDuration(run: PlaybookRun): number {
  if (!run.completedAt) return -1
  return new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
}

function stepDuration(step: { startedAt?: string; completedAt?: string }): number {
  if (!step.startedAt || !step.completedAt) return -1
  return new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
}

// ─── Run Detail ────────────────────────────────────────────────────────────────

function RunDetail({ run }: { run: PlaybookRun }) {
  const done    = run.steps.filter(s => s.status === 'done').length
  const skipped = run.steps.filter(s => s.status === 'skipped').length
  const dur     = runDuration(run)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg px-4 py-3 flex flex-wrap gap-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
        <InfoCell label="Playbook" value={run.playbookName} />
        <InfoCell label="Status" value={run.status} color={STATUS_COLOR[run.status]} />
        <InfoCell label="Started" value={new Date(run.startedAt).toLocaleString()} />
        {run.completedAt && <InfoCell label="Completed" value={new Date(run.completedAt).toLocaleString()} />}
        {dur > 0 && <InfoCell label="Duration" value={fmtDuration(dur)} color="var(--accent)" />}
        {run.labName    && <InfoCell label="Lab"    value={run.labName} />}
        {run.targetName && <InfoCell label="Target" value={run.targetName} />}
        <InfoCell label="Progress" value={`${done} done, ${skipped} skipped / ${run.steps.length} total`} />
      </div>

      <div className="flex flex-col gap-1.5">
        {run.steps.map(step => {
          const sd = stepDuration(step)
          return (
            <div key={step.id} className="rounded px-3 py-2" style={{ background: 'var(--panel)', border: '1px solid var(--border)', opacity: step.status === 'skipped' ? 0.55 : 1 }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{String(step.order).padStart(2, '0')}</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{step.title}</span>
                {sd > 0 && <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtDuration(sd)}</span>}
                <span className="text-xs font-medium flex-shrink-0" style={{ color: STEP_STATUS_COLOR[step.status ?? 'todo'] }}>
                  {step.status ?? 'todo'}
                </span>
                {step.completedAt && <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{new Date(step.completedAt).toLocaleTimeString()}</span>}
              </div>
              {step.operatorNotes && (
                <p className="text-xs mt-1 pl-6" style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>{step.operatorNotes}</p>
              )}
              {step.noteThread && step.noteThread.length > 0 && (
                <div className="pl-6 mt-1 flex flex-col gap-0.5">
                  {step.noteThread.map(n => (
                    <div key={n.id} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>{new Date(n.createdAt).toLocaleTimeString()}: </span>{n.text}
                    </div>
                  ))}
                </div>
              )}
              {step.evidence && step.evidence.length > 0 && (
                <div className="pl-6 mt-1 flex gap-1 flex-wrap">
                  {step.evidence.map(e => (
                    <span key={e} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                      📎 {e.split('/').pop()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Run Comparison ────────────────────────────────────────────────────────────

function RunComparison({ runA, runB, onBack }: { runA: PlaybookRun; runB: PlaybookRun; onBack: () => void }) {
  const durA = runDuration(runA)
  const durB = runDuration(runB)

  // Build per-step comparison by title (since IDs may differ across runs)
  const allTitles = [...new Set([...runA.steps.map(s => s.title), ...runB.steps.map(s => s.title)])]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <button onClick={onBack} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>← Back</button>
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>Run Comparison</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3">
          {[runA, runB].map((run, i) => (
            <div key={i} className="rounded-lg p-3 flex flex-col gap-1" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{run.playbookName}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(run.startedAt).toLocaleDateString()}</div>
              <div className="text-xs" style={{ color: STATUS_COLOR[run.status] }}>{run.status}</div>
              {runDuration(run) > 0 && <div className="text-xs" style={{ color: 'var(--accent)' }}>{fmtDuration(runDuration(run))}</div>}
            </div>
          ))}
        </div>

        {/* Duration diff */}
        {durA > 0 && durB > 0 && (
          <div className="rounded px-3 py-2 text-xs" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
            Duration diff:{' '}
            <span style={{ color: durA < durB ? 'var(--success)' : 'var(--warning)' }}>
              {durA < durB ? `Run A was ${fmtDuration(durB - durA)} faster` : `Run B was ${fmtDuration(durA - durB)} faster`}
            </span>
          </div>
        )}

        {/* Per-step comparison */}
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[1fr,80px,80px] gap-2 text-xs px-2 pb-1" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            <span>Step</span><span>Run A</span><span>Run B</span>
          </div>
          {allTitles.map(title => {
            const stepA = runA.steps.find(s => s.title === title)
            const stepB = runB.steps.find(s => s.title === title)
            const sdA = stepA ? stepDuration(stepA) : -1
            const sdB = stepB ? stepDuration(stepB) : -1
            return (
              <div key={title} className="grid grid-cols-[1fr,80px,80px] gap-2 text-xs px-2 py-1.5 rounded" style={{ background: 'var(--panel)' }}>
                <span className="truncate" style={{ color: 'var(--text)' }}>{title}</span>
                <span style={{ color: stepA ? STEP_STATUS_COLOR[stepA.status ?? 'todo'] : 'var(--text-muted)' }}>
                  {stepA ? (stepA.status ?? 'todo') : '—'}{sdA > 0 ? ` (${fmtDuration(sdA)})` : ''}
                </span>
                <span style={{ color: stepB ? STEP_STATUS_COLOR[stepB.status ?? 'todo'] : 'var(--text-muted)' }}>
                  {stepB ? (stepB.status ?? 'todo') : '—'}{sdB > 0 ? ` (${fmtDuration(sdB)})` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── HistoryView ───────────────────────────────────────────────────────────────

function InfoCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm" style={{ color: color ?? 'var(--text-dim)' }}>{value}</div>
    </div>
  )
}

export default function HistoryView() {
  const runs         = useStore(s => s.runs)
  const setActiveRun = useStore(s => s.setActiveRun)
  const setView      = useStore(s => s.setView)

  const [selected,    setSelected]    = useState<PlaybookRun | null>(null)
  const [compareSet,  setCompareSet]  = useState<Set<string>>(new Set())
  const [comparing,   setComparing]   = useState<[PlaybookRun, PlaybookRun] | null>(null)

  function handleRowClick(run: PlaybookRun, e: React.MouseEvent) {
    if (e.shiftKey) {
      setCompareSet(prev => {
        const next = new Set(prev)
        if (next.has(run.id)) { next.delete(run.id) } else if (next.size < 2) { next.add(run.id) }
        return next
      })
      return
    }
    setSelected(run)
  }

  function handleCompare() {
    const ids = [...compareSet]
    const a = runs.find(r => r.id === ids[0])
    const b = runs.find(r => r.id === ids[1])
    if (a && b) setComparing([a, b])
  }

  if (comparing) return <RunComparison runA={comparing[0]} runB={comparing[1]} onBack={() => setComparing(null)} />

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
        <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <button onClick={() => setSelected(null)} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-dim)' }}>← History</button>
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{selected.playbookName}</span>
          {selected.status === 'running' && (
            <button onClick={() => { setActiveRun(selected); setView('run') }} className="text-xs px-3 py-1 rounded font-medium" style={{ background: 'var(--warning)', color: '#000' }}>Resume</button>
          )}
          {selected.status === 'completed' && (
            <button onClick={() => window.electronAPI.exportRunReport(selected.id)} className="text-xs px-3 py-1 rounded font-medium"
              style={{ background: 'rgba(63,185,80,0.15)', color: 'var(--success)', border: '1px solid rgba(63,185,80,0.3)' }}>
              Export Report
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4"><RunDetail run={selected} /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Run History ({runs.length})</span>
        {compareSet.size === 2 && (
          <button onClick={handleCompare} className="text-xs px-3 py-1 rounded font-medium ml-auto"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Compare Selected
          </button>
        )}
        {compareSet.size === 1 && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Shift+click another run to compare</span>
        )}
        {compareSet.size === 0 && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Shift+click two runs to compare</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {runs.map(run => {
          const done  = run.steps.filter(s => s.status === 'done').length
          const total = run.steps.length
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0
          const dur   = runDuration(run)
          const inCompare = compareSet.has(run.id)

          return (
            <button key={run.id} onClick={e => handleRowClick(run, e)}
              className="w-full text-left rounded-lg px-4 py-3"
              style={{
                background: inCompare ? 'rgba(74,158,255,0.12)' : 'var(--panel)',
                border: `1px solid ${inCompare ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{run.playbookName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-medium" style={{ color: STATUS_COLOR[run.status], background: `${STATUS_COLOR[run.status]}22` }}>
                      {run.status}
                    </span>
                    {inCompare && <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>selected</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    {run.targetName && <span>Target: {run.targetName}</span>}
                    {run.labName    && <span>Lab: {run.labName}</span>}
                    {dur > 0 && <span style={{ color: 'var(--accent)' }}>{fmtDuration(dur)}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{done}/{total}</div>
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
