import { useState, useEffect } from 'react'
import type { PlaybookStep, StepType, PlaybookRun } from '@shared/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function elapsed(startedAt: string): string {
  // Guard:
  //   1. NaN if startedAt isn't a valid ISO string (renders as "NaN:NaN:NaN").
  //   2. Negative ms if the user's clock jumped backward or startedAt is in
  //      the future (renders as "-1:-1:-1" with broken padStart on negative
  //      numbers — the leading minus eats the pad).
  const startMs = new Date(startedAt).getTime()
  if (!Number.isFinite(startMs)) return '00:00:00'
  const ms = Math.max(0, Date.now() - startMs)
  const h  = Math.floor(ms / 3_600_000)
  const m  = Math.floor((ms % 3_600_000) / 60_000)
  const s  = Math.floor((ms % 60_000) / 1_000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtMs(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export const STEP_TYPE_BORDER: Record<StepType, string> = {
  action: '#4a9eff', verification: '#3fb950', documentation: '#8b949e', command: '#d29922', decision: '#bc8cff',
}

// Semantic icons per step type
export function StepTypeIcon({ type, color }: { type: StepType; color: string }) {
  const s = { stroke: color, strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  if (type === 'command') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" {...s}>
        <rect x="1" y="2" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.4" fill="none" />
        <path d="M3 5l2 1.5L3 8" {...s} strokeWidth="1.3" />
        <path d="M7 8h2" {...s} strokeWidth="1.3" />
      </svg>
    )
  }
  if (type === 'action') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" {...s}>
        <circle cx="6" cy="3" r="1.8" stroke={color} strokeWidth="1.4" fill="none" />
        <path d="M2 11c0-2.2 1.8-4 4-4s4 1.8 4 4" {...s} strokeWidth="1.4" />
      </svg>
    )
  }
  if (type === 'verification') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" {...s}>
        <path d="M6 1l4 1.5v3.5C10 9 8 10.5 6 11c-2-0.5-4-2-4-5V2.5z" stroke={color} strokeWidth="1.4" fill="none" />
        <path d="M4 6l1.5 1.5 2.5-2.5" {...s} strokeWidth="1.5" />
      </svg>
    )
  }
  if (type === 'documentation') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" {...s}>
        <rect x="2" y="1" width="8" height="10" rx="1.2" stroke={color} strokeWidth="1.4" fill="none" />
        <path d="M4 4h4M4 6.5h4M4 9h2.5" {...s} strokeWidth="1.2" />
      </svg>
    )
  }
  if (type === 'decision') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" {...s}>
        <circle cx="6" cy="2" r="1.2" stroke={color} strokeWidth="1.3" fill="none" />
        <circle cx="2.5" cy="10" r="1.2" stroke={color} strokeWidth="1.3" fill="none" />
        <circle cx="9.5" cy="10" r="1.2" stroke={color} strokeWidth="1.3" fill="none" />
        <path d="M6 3.2v2L2.5 8.8M6 5.2L9.5 8.8" {...s} strokeWidth="1.3" />
      </svg>
    )
  }
  return null
}

// ─── Variables Prompt Modal ────────────────────────────────────────────────────

export function VariablesModal({ vars, onConfirm, onCancel }: {
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

export function SessionContextBar({ lab, target, targetIP, startedAt }: {
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

export function ProgressBar({ done, total, runs, playbookId }: {
  done: number; total: number; runs: PlaybookRun[]; playbookId: string
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const eta = (() => {
    // Only consider completed past runs that have steps and a valid
    // duration — empty-step playbooks produced NaN/Infinity here when
    // we divided dur by r.steps.length === 0, which then propagated
    // through avgStepMs and rendered the bar as "ETA: ~NaNs remaining".
    const pastRuns = runs.filter(r =>
      r.playbookId === playbookId &&
      r.status === 'completed' &&
      r.completedAt &&
      r.steps.length > 0
    )
    if (pastRuns.length === 0 || done === 0) return null
    const avgStepMs = pastRuns.reduce((sum, r) => {
      const dur = new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime()
      return sum + dur / r.steps.length
    }, 0) / pastRuns.length
    if (!Number.isFinite(avgStepMs)) return null
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
            background: pct === 100 ? 'linear-gradient(90deg, #3fb950, #58c464)' : 'linear-gradient(90deg, #4a9eff, #79bfff)',
            transition: 'width 600ms cubic-bezier(0.2,0.8,0.2,1)',
          }}
        >
          {pct > 0 && pct < 100 && (
            <span className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
              animation: 'shimmerSlide 1.8s linear infinite',
            }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step Dot Track ────────────────────────────────────────────────────────────

export function StepDotTrack({ steps, activeId }: { steps: PlaybookStep[]; activeId: string | null }) {
  if (steps.length === 0 || steps.length > 30) return null
  return (
    <div className="flex items-center gap-1 px-4 py-2 flex-shrink-0 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border)', background: 'rgba(13,14,24,0.6)' }}>
      {steps.map((step, i) => {
        const status = step.status ?? 'todo'
        const isActive = step.id === activeId
        let dotColor = 'rgba(42,51,71,0.6)'
        let dotBg    = 'transparent'
        if (status === 'done')          { dotColor = 'var(--success)';  dotBg = 'rgba(63,185,80,0.18)' }
        else if (status === 'skipped')  { dotColor = 'var(--text-muted)'; dotBg = 'rgba(72,79,88,0.18)' }
        else if (status === 'inprogress'){ dotColor = 'var(--accent)';  dotBg = 'rgba(74,158,255,0.15)' }
        else if (isActive)              { dotColor = 'var(--accent)';   dotBg = 'rgba(74,158,255,0.10)' }
        return (
          <div key={step.id} className="flex items-center">
            <div className="step-dot-pop flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-mono font-semibold"
              style={{ width: isActive ? 20 : 16, height: isActive ? 20 : 16, background: dotBg, border: `1px solid ${dotColor}`, color: dotColor, transition: 'all 200ms ease', boxShadow: isActive ? '0 0 0 2px rgba(74,158,255,0.18)' : 'none' }}
              title={`${step.order}. ${step.title}`}>
              {status === 'done' ? '✓' : status === 'skipped' ? '↷' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className="flex-shrink-0" style={{ width: 8, height: 1, background: status === 'done' ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.4)', margin: '0 1px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step List Item ────────────────────────────────────────────────────────────

export function StepListItem({ step, isActive, isBlocked, onClick }: {
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
      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center" title={step.stepType ?? 'action'}>
        <StepTypeIcon type={step.stepType ?? 'action'} color={isActive ? typeColor : 'rgba(139,148,158,0.55)'} />
      </span>
      <span className="flex-1 truncate">{step.title}</span>
      {step.required && (status === 'todo' || status === 'inprogress') && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)' }} />
      )}
    </button>
  )
}

// ─── Complete Run Modal ────────────────────────────────────────────────────────

export function CompleteRunModal({ playbookName, steps, startedAt, onConfirm, onAbandon, onCancel }: {
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
            {required.length} required step{required.length !== 1 ? 's' : ''} not completed: {required.map(s => s.title).join(', ')}
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
