import { useState } from 'react'
import { useStore } from '../../store'
import type { Playbook, PlaybookCategory } from '@shared/types'

// Rough estimate: ~3 minutes per step
export function estimatedTime(stepCount: number): string {
  const mins = stepCount * 3
  if (mins < 60) return `~${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

// Highlight search term in text
export function HighlightMatch({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <em style={{ fontStyle: 'normal', color: '#2dd4bf', background: 'rgba(45,212,191,0.12)', borderRadius: 2 }}>
        {text.slice(idx, idx + term.length)}
      </em>
      {text.slice(idx + term.length)}
    </>
  )
}

export const CAT_COLORS: Record<PlaybookCategory, string> = {
  'web-app':          '#e3b341',
  'network':          '#58a6ff',
  'active-directory': '#bc8cff',
  'linux':            '#3fb950',
  'windows':          '#79c0ff',
  'ctf':              '#ff7b72',
  'custom':           '#8b949e',
  'ccna':             '#f0883e',
}

export default function PlaybookCard({ pb, searchTerm = '', staggerIndex = 0 }: {
  pb: Playbook; searchTerm?: string; staggerIndex?: number
}) {
  const setView           = useStore(s => s.setView)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setRuns           = useStore(s => s.setRuns)
  const setActiveRun      = useStore(s => s.setActiveRun)
  const setPlaybooks      = useStore(s => s.setPlaybooks)
  const runs              = useStore(s => s.runs)
  const [exporting, setExporting] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)

  async function handleRun() {
    const res = await window.electronAPI.startRun(pb.id)
    if (res.ok && res.run) {
      const allRuns = await window.electronAPI.getAllRuns()
      setRuns(allRuns)
      setActiveRun(res.run)
      setView('run')
    }
  }

  async function handleEdit() {
    setActivePlaybook(pb)
    setView('editor')
  }

  async function handleClone() {
    const res = await window.electronAPI.clonePlaybook(pb.id)
    if (res.ok) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
    }
  }

  async function handleDelete() {
    if (!deleteArmed) {
      setDeleteArmed(true)
      setTimeout(() => setDeleteArmed(false), 4000)
      return
    }
    setDeleteArmed(false)
    const res = await window.electronAPI.deletePlaybook(pb.id)
    if (res.ok) {
      const all = await window.electronAPI.getAllPlaybooks()
      setPlaybooks(all)
    }
  }

  async function handleExportBundle() {
    setExporting(true)
    await window.electronAPI.exportBundle(pb.id)
    setExporting(false)
  }

  const catColor  = CAT_COLORS[pb.category] ?? '#8b949e'
  const pbRuns    = runs.filter(r => r.playbookId === pb.id && (r.status === 'completed' || r.status === 'abandoned' || r.status === 'running'))
  const lastRun   = pbRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
  const runCount  = pbRuns.length
  const lastRunLabel  = (() => {
    if (!lastRun) return null
    const diff = Date.now() - new Date(lastRun.startedAt).getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) return 'today'
    if (days === 1) return '1d ago'
    return `${days}d ago`
  })()
  const mitreTactics  = [...new Set(pb.steps.flatMap(s => s.mitreTechniqueId ? [s.mitreTechniqueId.split('.')[0]] : []))]

  // Last-run result badge
  const lastRunBadge = (() => {
    if (!lastRun) return null
    if (lastRun.status === 'running')   return { label: 'Running',   bg: 'rgba(210,153,34,0.12)', color: '#d29922', border: 'rgba(210,153,34,0.28)' }
    const allDone    = lastRun.steps.every(s => s.status === 'done' || s.status === 'skipped')
    const anyRequired = lastRun.steps.some(s => s.required && s.status !== 'done' && s.status !== 'skipped')
    if (lastRun.status === 'abandoned') return { label: 'Abandoned', bg: 'rgba(248,81,73,0.10)', color: '#f85149', border: 'rgba(248,81,73,0.25)' }
    if (anyRequired)                    return { label: 'Fail',      bg: 'rgba(248,81,73,0.10)', color: '#f85149', border: 'rgba(248,81,73,0.25)' }
    if (allDone)                        return { label: 'Pass',      bg: 'rgba(63,185,80,0.10)',  color: '#3fb950', border: 'rgba(63,185,80,0.25)' }
    return { label: 'Pass', bg: 'rgba(63,185,80,0.10)', color: '#3fb950', border: 'rgba(63,185,80,0.25)' }
  })()

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3 group library-card-enter"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease',
        animationDelay: `${staggerIndex * 40}ms`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(74,158,255,0.4)'
        el.style.boxShadow = '0 4px 20px rgba(74,158,255,0.08), 0 1px 4px rgba(0,0,0,0.4)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(42,51,71,0.6)'
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}
            >
              {pb.category}
            </span>
            {pb.isBuiltIn && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,158,255,0.08)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.18)' }}>
                built-in
              </span>
            )}
            {mitreTactics.slice(0, 2).map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(188,140,255,0.08)', color: '#bc8cff', border: '1px solid rgba(188,140,255,0.2)' }}>
                {t}
              </span>
            ))}
          </div>
          <div className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>
            <HighlightMatch text={pb.name} term={searchTerm} />
          </div>
          <div className="text-xs mt-0.5 line-clamp-2" style={{ color: '#8b949e' }}>{pb.description}</div>
          {pb.tags && pb.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {pb.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(139,148,158,0.1)', color: '#6b7280', border: '1px solid rgba(139,148,158,0.2)', fontSize: 10 }}
                >
                  #{tag}
                </span>
              ))}
              {pb.tags.length > 3 && (
                <span className="text-xs" style={{ color: '#484f58', fontSize: 10 }}>+{pb.tags.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(42,51,71,0.35)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(74,158,255,0.08)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.2)' }}>
            {pb.steps.length} steps
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(42,51,71,0.25)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.4)' }}>
            {estimatedTime(pb.steps.length)}
          </span>
          {lastRunBadge && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ background: lastRunBadge.bg, color: lastRunBadge.color, border: `1px solid ${lastRunBadge.border}` }}
              title={lastRunLabel ? `Last run: ${lastRunLabel}` : undefined}
            >
              {lastRunBadge.label}
            </span>
          )}
          {runCount > 0 && (
            <span className="text-xs" style={{ color: '#8b949e' }}>
              Run {runCount}x{lastRunLabel ? ` · ${lastRunLabel}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleRun} className="no-drag text-xs px-2.5 py-1 rounded font-semibold transition-colors"
            style={{ background: '#4a9eff', color: '#0a0a0f', border: '1px solid #4a9eff', height: 28 }}>
            Run
          </button>
          {!pb.isBuiltIn && (
            <button onClick={handleEdit} className="no-drag text-xs px-2 py-1 rounded transition-colors"
              style={{ background: 'rgba(42,51,71,0.4)', color: '#e2e8f0', border: '1px solid rgba(42,51,71,0.6)', height: 28 }}>
              Edit
            </button>
          )}
          <button onClick={handleClone} className="no-drag text-xs px-2 py-1 rounded transition-colors"
            style={{ background: 'rgba(42,51,71,0.4)', color: '#e2e8f0', border: '1px solid rgba(42,51,71,0.6)', height: 28 }}>
            Clone
          </button>
          <button onClick={handleExportBundle} disabled={exporting} className="no-drag text-xs px-2 py-1 rounded transition-colors"
            style={{ background: 'rgba(42,51,71,0.4)', color: '#e2e8f0', border: '1px solid rgba(42,51,71,0.6)', height: 28 }}>
            {exporting ? '…' : 'Export'}
          </button>
          {!pb.isBuiltIn && (
            <button onClick={handleDelete} title={deleteArmed ? 'Click again within 4 s to delete' : `Delete "${pb.name}"`} className="no-drag text-xs px-2 py-1 rounded transition-colors"
              style={{ background: deleteArmed ? 'rgba(248,81,73,0.28)' : 'rgba(248,81,73,0.08)', color: '#f85149', border: `1px solid ${deleteArmed ? 'rgba(248,81,73,0.55)' : 'rgba(248,81,73,0.2)'}`, height: 28, fontWeight: deleteArmed ? 700 : 400 }}>
              {deleteArmed ? 'Sure?' : 'Del'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
