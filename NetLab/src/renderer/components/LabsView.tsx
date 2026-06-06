// NetLab — LabsView.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNetLabStore } from '../store'
import type { Lab, LabCategory } from '@shared/types'
import LabStepView from './LabStepView'
import HelpTip from './ui/HelpTip'

const CATEGORIES: LabCategory[] = ['CCNA', 'CCNP', 'Linux', 'FortiGate', 'EVE-NG', 'GNS3']
const DIFF_LABELS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

function diffColor(d: number): string {
  if (d <= 1) return '#3fb950'
  if (d <= 2) return '#5ec4ff'
  if (d <= 3) return '#d29922'
  return '#f85149'
}

function LabCard({ lab, isActive, onSelect, progress }: {
  lab: Lab
  isActive: boolean
  onSelect: () => void
  progress?: { completedAt?: string }
}) {
  return (
    <motion.button
      onClick={onSelect}
      className="w-full text-left p-3 rounded border transition-colors"
      style={isActive
        ? { background: 'rgba(94,196,255,0.08)', borderColor: '#5ec4ff' }
        : { background: '#0f1117', borderColor: '#2a3347' }}
      whileHover={{ borderColor: '#5ec4ff' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-text-primary leading-tight">{lab.title}</span>
        {progress?.completedAt && (
          <span className="text-2xs px-1.5 py-0.5 rounded shrink-0"
            style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950' }}>
            Done
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-2xs px-1.5 py-0.5 rounded" style={{ background: '#161b27', color: '#8b949e' }}>
          {lab.vendor}
        </span>
        <span className="text-2xs font-mono" style={{ color: diffColor(lab.difficulty) }}>
          {DIFF_LABELS[lab.difficulty]}
        </span>
      </div>
      <p className="text-2xs text-text-muted mt-1 line-clamp-2">{lab.description}</p>
    </motion.button>
  )
}

export default function LabsView() {
  const labs            = useNetLabStore(s => s.labs)
  const progress        = useNetLabStore(s => s.progress)
  const activeLab       = useNetLabStore(s => s.activeLab)
  const setActiveLab    = useNetLabStore(s => s.setActiveLab)
  const startLabTimer   = useNetLabStore(s => s.startLabTimer)

  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState<LabCategory | 'All'>('All')
  const [difficulty, setDifficulty] = useState<number | 'All'>('All')
  const [preview, setPreview]       = useState<Lab | null>(null)

  const filtered = labs.filter(lab => {
    const matchCat  = category === 'All' || lab.category === category
    const matchDiff = difficulty === 'All' || lab.difficulty === difficulty
    const matchSrch = !search || lab.title.toLowerCase().includes(search.toLowerCase()) || lab.tags.some(t => t.includes(search.toLowerCase()))
    return matchCat && matchDiff && matchSrch
  })

  // Auto-select first lab for preview
  const previewLab = preview ?? (filtered.length > 0 ? filtered[0] : null)

  function handleStart(lab: Lab) {
    setActiveLab(lab)
    startLabTimer()
  }

  if (activeLab) {
    return <LabStepView />
  }

  return (
    <div className="flex h-full">
      {/* Left pane — lab list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-border-subtle">
        {/* Search */}
        <div className="p-3 border-b border-border-subtle">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-2xs text-text-muted uppercase tracking-wider">Labs</span>
            <HelpTip
              title="Labs List"
              body="Filter labs by category, difficulty, or keyword. Click any card to preview its objective on the right, then hit Start Lab."
            />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search labs..."
            className="w-full px-3 py-2 rounded text-sm bg-bg-elevated border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:border-[#5ec4ff]"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5 p-3 border-b border-border-subtle">
          {(['All', ...CATEGORIES] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="text-2xs px-2 py-1 rounded transition-colors"
              style={category === c
                ? { background: 'rgba(94,196,255,0.15)', color: '#5ec4ff', border: '1px solid #5ec4ff' }
                : { background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border-subtle">
          <span className="text-2xs text-text-muted mr-1">Difficulty:</span>
          {(['All', 1, 2, 3, 4, 5] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className="text-2xs px-1.5 py-0.5 rounded transition-colors"
              style={difficulty === d
                ? { background: 'rgba(94,196,255,0.15)', color: '#5ec4ff' }
                : { color: '#8b949e' }}
            >
              {d === 'All' ? 'All' : DIFF_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Lab list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filtered.length === 0 && (
            <p className="text-sm text-text-muted text-center pt-8">No labs match your filters.</p>
          )}
          {filtered.map(lab => (
            <LabCard
              key={lab.id}
              lab={lab}
              isActive={previewLab?.id === lab.id}
              onSelect={() => setPreview(lab)}
              progress={progress[lab.id]}
            />
          ))}
        </div>
      </div>

      {/* Right pane — lab detail */}
      {previewLab ? (
        <LabDetail lab={previewLab} progress={progress[previewLab.id]} onStart={handleStart} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-4" style={{ opacity: 0.3 }}>📋</span>
          <p className="text-text-secondary text-sm">Select a lab from the list to view details.</p>
        </div>
      )}
    </div>
  )
}

function LabDetail({ lab, progress, onStart }: { lab: Lab; progress?: import('@shared/types').LabProgress | undefined; onStart: (lab: Lab) => void }) {
  const completedSteps = progress ? Object.values(progress.stepResults).filter(r => r.passed).length : 0

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-text-primary">{lab.title}</h2>
              <HelpTip
                title="Lab Detail"
                body="Review the lab's objective, target topology, and prerequisite tags before starting. Hit Start Lab to begin stepping through the exercise."
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xs px-2 py-0.5 rounded" style={{ background: 'rgba(94,196,255,0.1)', color: '#5ec4ff' }}>
                {lab.category}
              </span>
              <span className="text-2xs px-2 py-0.5 rounded" style={{ background: '#161b27', color: '#8b949e' }}>
                {lab.vendor}
              </span>
              <span className="text-2xs text-warning">{DIFF_LABELS[lab.difficulty]}</span>
            </div>
          </div>
          <motion.button
            onClick={() => onStart(lab)}
            className="px-4 py-2 rounded text-sm font-semibold transition-colors"
            style={{ background: '#5ec4ff', color: '#0a0a0f' }}
            whileHover={{ opacity: 0.85 }}
            whileTap={{ scale: 0.97 }}
          >
            {progress?.completedAt ? 'Retry Lab' : 'Start Lab'}
          </motion.button>
        </div>

        <p className="text-sm text-text-secondary mb-4">{lab.description}</p>

        {lab.topology && (
          <div className="p-3 rounded border border-border-default mb-4" style={{ background: '#0f1117' }}>
            <p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Topology</p>
            <p className="text-sm text-text-secondary font-mono-code">{lab.topology}</p>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-2xs text-text-muted mb-1">
              <span>Progress</span>
              <span>{completedSteps} / {lab.steps.length} steps</span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(completedSteps / lab.steps.length) * 100}%`, background: '#5ec4ff' }}
              />
            </div>
          </div>
        )}

        {/* Step list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Steps ({lab.steps.length})
            </p>
            <HelpTip
              title="Step List"
              body="Each step has a command, expected output, and hints. Completing every step in order marks the lab done — green check icons indicate verified steps."
            />
          </div>
          <div className="flex flex-col gap-2">
            {lab.steps.map(step => {
              const result = progress?.stepResults[step.id]
              return (
                <div key={step.id}
                  className="flex items-start gap-3 p-3 rounded border border-border-subtle"
                  style={{ background: '#0f1117' }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-mono shrink-0 mt-0.5"
                    style={
                      result?.passed
                        ? { background: 'rgba(63,185,80,0.2)', color: '#3fb950', border: '1px solid #3fb950' }
                        : { background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }
                    }
                  >
                    {result?.passed ? '✓' : step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{step.title}</p>
                    {step.command && (
                      <code className="text-2xs font-mono-code text-[#5ec4ff] mt-0.5 block truncate">
                        {step.command.split('\n')[0]}
                        {step.command.includes('\n') && '...'}
                      </code>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {lab.tags.map(tag => (
            <span key={tag} className="text-2xs px-2 py-0.5 rounded" style={{ background: '#161b27', color: '#4a5568' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
