import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import NewTargetModal from '../target/NewTargetModal'
import CsvImportModal from '../target/CsvImportModal'
import EngagementScopePanel from '../engagement/EngagementScopePanel'
import type { TargetStatus, Platform } from '../../types/recondesk'

const STATUS_COLOR: Record<TargetStatus, string> = {
  active:    '#3fb950',
  completed: '#4a9eff',
  abandoned: '#484f58',
  paused:    '#d29922',
}

const STATUS_RGB: Record<TargetStatus, string> = {
  active:    '63,185,80',
  completed: '74,158,255',
  abandoned: '72,79,88',
  paused:    '210,153,34',
}

const PLATFORM_STYLE: Record<Platform, { color: string; bg: string; border: string }> = {
  HTB:      { color: '#f85149', bg: 'rgba(248,81,73,0.10)',  border: 'rgba(248,81,73,0.20)'  },
  THM:      { color: '#3fb950', bg: 'rgba(63,185,80,0.10)',  border: 'rgba(63,185,80,0.20)'  },
  CTF:      { color: '#b44fff', bg: 'rgba(180,79,255,0.10)', border: 'rgba(180,79,255,0.20)' },
  Client:   { color: '#4a9eff', bg: 'rgba(74,158,255,0.10)', border: 'rgba(74,158,255,0.20)' },
  Internal: { color: '#8b949e', bg: 'rgba(139,148,158,0.10)',border: 'rgba(139,148,158,0.20)'},
}

export default function Sidebar() {
  const targets             = useRecondeskStore(s => s.targets)
  const engagements         = useRecondeskStore(s => s.engagements)
  const activeTargetId      = useRecondeskStore(s => s.activeTargetId)
  const activeEngagementId  = useRecondeskStore(s => s.activeEngagementId)
  const setActiveTarget     = useRecondeskStore(s => s.setActiveTarget)
  const setActiveEngagement = useRecondeskStore(s => s.setActiveEngagement)
  const isNewTargetOpen     = useRecondeskStore(s => s.isNewTargetModalOpen)
  const setNewTargetModal   = useRecondeskStore(s => s.setNewTargetModal)
  const isCsvImportOpen     = useRecondeskStore(s => s.isCsvImportOpen)
  const setCsvImportOpen    = useRecondeskStore(s => s.setCsvImportOpen)
  const addEngagement       = useRecondeskStore(s => s.addEngagement)

  const activeTarget = targets.find(t => t.id === activeTargetId)

  const [collapsed, setCollapsed]     = useState<Set<string>>(new Set())
  const [showActions, setShowActions] = useState(false)
  const [scopeEngId, setScopeEngId]   = useState<string | null>(null)

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredTargets = activeEngagementId
    ? targets.filter(t => t.engagementId === activeEngagementId)
    : targets

  const groups = engagements.map(eng => ({
    engagement: eng,
    targets: filteredTargets.filter(t => t.engagementId === eng.id),
  })).filter(g => g.targets.length > 0)

  const ungrouped = filteredTargets.filter(t => !engagements.find(e => e.id === t.engagementId))

  function TargetRow({ target, i }: { target: typeof targets[number]; i: number }) {
    const isActive = target.id === activeTargetId
    const sColor   = STATUS_COLOR[target.status]
    const sRgb     = STATUS_RGB[target.status]
    const pStyle   = PLATFORM_STYLE[target.platform]

    return (
      <motion.div
        key={target.id}
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.03, duration: 0.18 }}
      >
        <button
          onClick={() => setActiveTarget(target.id)}
          className="group w-full text-left px-3 py-2 transition-all relative"
          style={isActive ? {
            background: 'rgba(210,153,34,0.07)',
            borderLeft: '2px solid #d29922',
          } : {
            borderLeft: '2px solid transparent',
          }}
          onMouseEnter={e => {
            if (!isActive) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.18)'
              ;(e.currentTarget as HTMLButtonElement).style.borderLeftColor = 'rgba(210,153,34,0.35)'
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              (e.currentTarget as HTMLButtonElement).style.background = ''
              ;(e.currentTarget as HTMLButtonElement).style.borderLeftColor = 'transparent'
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${target.status === 'active' ? 'status-dot-pulse' : ''}`}
              style={{ backgroundColor: sColor, '--pulse-rgb': sRgb } as React.CSSProperties}
            />
            <span className="text-xs flex-1 truncate font-medium" style={{ color: isActive ? '#e6edf3' : '#8b949e', fontWeight: isActive ? 600 : 500 }}>
              {target.name}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0"
              style={{ color: pStyle.color, background: pStyle.bg, borderColor: pStyle.border }}
            >
              {target.platform}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 pl-3.5">
            <span className="text-[10px] font-mono" style={{ color: '#484f58' }}>{target.ip}</span>
            <span className="text-[10px]" style={{ color: 'rgba(72,79,88,0.5)' }}>·</span>
            <span className="text-[10px] capitalize" style={{ color: sColor }}>{target.status}</span>
          </div>
        </button>
      </motion.div>
    )
  }

  return (
    <aside
      className="w-60 flex flex-col flex-shrink-0"
      style={{ background: 'rgba(13,14,24,0.92)', borderRight: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.4)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#484f58' }}>
          Targets <span style={{ color: '#8b949e' }}>({targets.length})</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowActions(s => !s)}
            title="More actions"
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors text-xs"
            style={{ color: '#8b949e' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#8b949e' }}
          >
            ⋯
          </button>
          <button
            onClick={() => setNewTargetModal(true)}
            title="New target"
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors text-sm font-medium"
            style={{ color: '#8b949e' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(210,153,34,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = '#d29922' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#8b949e' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Actions dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
            className="mx-2 mt-1.5 rounded-lg overflow-hidden shadow-elevation-2"
            style={{ background: '#0d0e18', border: '1px solid rgba(42,51,71,0.6)' }}
          >
            <button
              onClick={() => { setCsvImportOpen(true); setShowActions(false) }}
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{ color: '#8b949e' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#8b949e' }}
            >
              Import CSV
            </button>
            <button
              onClick={() => { addEngagement(`Engagement ${engagements.length + 1}`); setShowActions(false) }}
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{ color: '#8b949e', borderTop: '1px solid rgba(42,51,71,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.color = '#8b949e' }}
            >
              New Engagement
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active lab context strip */}
      {activeTarget && (
        <div
          className="mx-2 mt-2 px-2.5 py-2 rounded-md"
          style={{ background: 'rgba(210,153,34,0.05)', border: '1px solid rgba(210,153,34,0.15)' }}
        >
          <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(210,153,34,0.6)' }}>Active Lab</p>
          <p className="text-xs font-semibold truncate" style={{ color: '#e6edf3' }}>{activeTarget.name}</p>
          <p className="text-[10px] font-mono" style={{ color: 'rgba(210,153,34,0.75)' }}>{activeTarget.ip}</p>
        </div>
      )}

      {/* Engagement filter pills */}
      {engagements.length > 1 && (
        <div className="px-2 pt-2 pb-1 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveEngagement(null)}
            className="text-[9px] px-1.5 py-0.5 rounded border transition-colors"
            style={!activeEngagementId
              ? { background: 'rgba(210,153,34,0.15)', borderColor: 'rgba(210,153,34,0.30)', color: '#d29922' }
              : { borderColor: 'rgba(42,51,71,0.5)', color: '#484f58' }
            }
          >
            All
          </button>
          {engagements.map(e => (
            <button
              key={e.id}
              onClick={() => setActiveEngagement(activeEngagementId === e.id ? null : e.id)}
              className="text-[9px] px-1.5 py-0.5 rounded border transition-colors"
              style={activeEngagementId === e.id
                ? { backgroundColor: `${e.color}20`, borderColor: `${e.color}40`, color: e.color }
                : { borderColor: 'rgba(42,51,71,0.5)', color: '#484f58' }
              }
            >
              {e.name}
            </button>
          ))}
        </div>
      )}

      {/* Target list */}
      <div className="flex-1 overflow-y-auto py-1">
        {targets.length === 0 && (
          <p className="text-[11px] text-center mt-8 px-3 leading-relaxed" style={{ color: '#484f58' }}>
            No targets yet.<br />Hit + to add one.
          </p>
        )}

        <AnimatePresence initial>
          {groups.map(({ engagement: eng, targets: engTargets }) => {
            const isCollapsed = collapsed.has(eng.id)
            return (
              <div key={eng.id}>
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleCollapse(eng.id)}
                    className="flex-1 flex items-center gap-2 px-3 py-1.5 transition-colors min-w-0"
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,51,71,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: eng.color }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest flex-1 truncate text-left" style={{ color: eng.color }}>
                      {eng.name}
                    </span>
                    <span className="text-[9px]" style={{ color: '#484f58' }}>{engTargets.length}</span>
                    <span className="text-[9px]" style={{ color: '#484f58' }}>{isCollapsed ? '▸' : '▾'}</span>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setScopeEngId(eng.id) }}
                    title="Edit scope / RoE"
                    className="opacity-0 group-hover:opacity-100 mr-2 px-1.5 py-0.5 text-[9px] rounded border transition-all flex-shrink-0"
                    style={{ borderColor: !eng.inScope ? 'rgba(210,153,34,0.4)' : 'rgba(210,153,34,0.25)', color: !eng.inScope ? 'rgba(210,153,34,0.8)' : 'rgba(210,153,34,0.6)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(210,153,34,0.10)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '' }}
                  >
                    {eng.inScope ? 'RoE' : '⚠ RoE'}
                  </button>
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                    >
                      {engTargets.map((t, i) => <TargetRow key={t.id} target={t} i={i} />)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </AnimatePresence>

        {ungrouped.map((t, i) => <TargetRow key={t.id} target={t} i={i} />)}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isNewTargetOpen && <NewTargetModal />}
      </AnimatePresence>
      <AnimatePresence>
        {isCsvImportOpen && <CsvImportModal />}
      </AnimatePresence>
      <AnimatePresence>
        {scopeEngId && <EngagementScopePanel engagementId={scopeEngId} onClose={() => setScopeEngId(null)} />}
      </AnimatePresence>
    </aside>
  )
}
