import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import NewTargetModal from '../target/NewTargetModal'
import CsvImportModal from '../target/CsvImportModal'
import type { TargetStatus, Platform } from '../../types/recondesk'

const STATUS_DOT: Record<TargetStatus, string> = {
  active:    'bg-[#3fb950]',
  completed: 'bg-[#4a9eff]',
  abandoned: 'bg-[#4a5568]',
  paused:    'bg-[#d29922]',
}

const STATUS_DOT_PULSE: Record<TargetStatus, string> = {
  active: 'status-dot-pulse', completed: '', abandoned: '', paused: '',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  HTB:      'text-[#f85149] bg-[#f85149]/10 border-[#f85149]/20',
  THM:      'text-[#3fb950] bg-[#3fb950]/10 border-[#3fb950]/20',
  CTF:      'text-[#b44fff] bg-[#b44fff]/10 border-[#b44fff]/20',
  Client:   'text-[#4a9eff] bg-[#4a9eff]/10 border-[#4a9eff]/20',
  Internal: 'text-[#8b949e] bg-[#8b949e]/10 border-[#8b949e]/20',
}

export default function Sidebar() {
  const targets            = useRecondeskStore(s => s.targets)
  const engagements        = useRecondeskStore(s => s.engagements)
  const activeTargetId     = useRecondeskStore(s => s.activeTargetId)
  const activeEngagementId = useRecondeskStore(s => s.activeEngagementId)
  const setActiveTarget    = useRecondeskStore(s => s.setActiveTarget)
  const setActiveEngagement = useRecondeskStore(s => s.setActiveEngagement)
  const isNewTargetOpen    = useRecondeskStore(s => s.isNewTargetModalOpen)
  const setNewTargetModal  = useRecondeskStore(s => s.setNewTargetModal)
  const isCsvImportOpen    = useRecondeskStore(s => s.isCsvImportOpen)
  const setCsvImportOpen   = useRecondeskStore(s => s.setCsvImportOpen)
  const addEngagement      = useRecondeskStore(s => s.addEngagement)

  const activeTarget = targets.find(t => t.id === activeTargetId)

  // Collapsible engagement sections
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showActions, setShowActions] = useState(false)

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Filter targets by active engagement if set
  const filteredTargets = activeEngagementId
    ? targets.filter(t => t.engagementId === activeEngagementId)
    : targets

  // Group targets by engagement
  const groups = engagements.map(eng => ({
    engagement: eng,
    targets: filteredTargets.filter(t => t.engagementId === eng.id),
  })).filter(g => g.targets.length > 0)

  // Ungrouped targets (no matching engagement)
  const ungrouped = filteredTargets.filter(t => !engagements.find(e => e.id === t.engagementId))

  function TargetRow({ target, i }: { target: typeof targets[number]; i: number }) {
    const isActive = target.id === activeTargetId
    return (
      <motion.div
        key={target.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.03, duration: 0.18 }}
      >
        <button
          onClick={() => setActiveTarget(target.id)}
          className={`group w-full text-left px-3 py-2 transition-all relative ${
            isActive
              ? 'bg-[#d29922]/8 border-l-2 border-[#d29922]'
              : 'border-l-2 border-transparent hover:bg-[#2a3347]/25 hover:border-[#d29922]/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[target.status]} ${isActive ? STATUS_DOT_PULSE[target.status] : ''}`} />
            <span className={`text-xs flex-1 truncate ${isActive ? 'font-semibold text-[#e2e8f0]' : 'font-medium text-[#8b949e]'}`}>
              {target.name}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${PLATFORM_COLORS[target.platform]}`}>
              {target.platform}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 pl-3.5">
            <span className="text-[10px] font-mono text-[#4a5568]">{target.ip}</span>
            <span className="text-[10px] text-[#4a5568]/50">·</span>
            <span className={`text-[10px] capitalize ${
              target.status === 'active'    ? 'text-[#3fb950]' :
              target.status === 'completed' ? 'text-[#4a9eff]' :
              target.status === 'paused'    ? 'text-[#d29922]' : 'text-[#4a5568]'
            }`}>{target.status}</span>
          </div>
        </button>
      </motion.div>
    )
  }

  return (
    <aside className="w-60 flex flex-col border-r border-[#2a3347] flex-shrink-0 bg-[#0d0d14]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3347]">
        <span className="text-[11px] font-semibold text-[#4a5568] uppercase tracking-widest">
          Targets <span className="text-[#8b949e]">({targets.length})</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowActions(s => !s)}
            title="More actions"
            className="w-5 h-5 flex items-center justify-center text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347] rounded transition-colors text-xs"
          >
            ⋯
          </button>
          <button
            onClick={() => setNewTargetModal(true)}
            title="New target"
            className="w-5 h-5 flex items-center justify-center text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347] rounded transition-colors text-sm"
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
            className="mx-2 mt-1.5 bg-[#12131a] border border-[#2a3347] rounded-lg overflow-hidden"
          >
            <button
              onClick={() => { setCsvImportOpen(true); setShowActions(false) }}
              className="w-full text-left px-3 py-2 text-xs text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347]/40 transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => { addEngagement(`Engagement ${engagements.length + 1}`); setShowActions(false) }}
              className="w-full text-left px-3 py-2 text-xs text-[#8b949e] hover:text-[#e2e8f0] hover:bg-[#2a3347]/40 transition-colors border-t border-[#2a3347]/50"
            >
              New Engagement
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active lab context strip */}
      {activeTarget && (
        <div className="mx-2 mt-2 px-2.5 py-2 rounded bg-[#d29922]/5 border border-[#d29922]/15">
          <p className="text-[9px] text-[#d29922]/60 uppercase tracking-widest mb-0.5">Active Lab Context</p>
          <p className="text-xs font-medium text-[#e2e8f0] truncate">{activeTarget.name}</p>
          <p className="text-[10px] font-mono text-[#d29922]/70">{activeTarget.ip}</p>
        </div>
      )}

      {/* Engagement filter pills */}
      {engagements.length > 1 && (
        <div className="px-2 pt-2 pb-1 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveEngagement(null)}
            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
              !activeEngagementId ? 'bg-[#d29922]/15 border-[#d29922]/30 text-[#d29922]' : 'border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'
            }`}
          >
            All
          </button>
          {engagements.map(e => (
            <button
              key={e.id}
              onClick={() => setActiveEngagement(activeEngagementId === e.id ? null : e.id)}
              className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                activeEngagementId === e.id
                  ? 'border text-white'
                  : 'border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'
              }`}
              style={activeEngagementId === e.id ? { backgroundColor: `${e.color}20`, borderColor: `${e.color}40`, color: e.color } : {}}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}

      {/* Target list */}
      <div className="flex-1 overflow-y-auto py-1">
        {targets.length === 0 && (
          <p className="text-[11px] text-[#4a5568] text-center mt-8 px-3 leading-relaxed">
            No targets yet.<br />Hit + to add one.
          </p>
        )}

        {/* Grouped by engagement */}
        <AnimatePresence initial>
          {groups.map(({ engagement: eng, targets: engTargets }) => {
            const isCollapsed = collapsed.has(eng.id)
            return (
              <div key={eng.id}>
                <button
                  onClick={() => toggleCollapse(eng.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a3347]/20 transition-colors group"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: eng.color }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest flex-1 text-left" style={{ color: eng.color }}>
                    {eng.name}
                  </span>
                  <span className="text-[9px] text-[#4a5568]">{engTargets.length}</span>
                  <span className="text-[9px] text-[#4a5568]">{isCollapsed ? '▸' : '▾'}</span>
                </button>
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

        {/* Ungrouped */}
        {ungrouped.map((t, i) => <TargetRow key={t.id} target={t} i={i} />)}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isNewTargetOpen && <NewTargetModal />}
      </AnimatePresence>
      <AnimatePresence>
        {isCsvImportOpen && <CsvImportModal />}
      </AnimatePresence>
    </aside>
  )
}
