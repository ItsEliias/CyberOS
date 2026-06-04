// ReconDesk — Global Search (Cmd+K, Feature 14)
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../stores/useRecondeskStore'

export default function GlobalSearch() {
  const [open, setOpen]   = useState(false)
  const inputRef          = useRef<HTMLInputElement>(null)
  const runSearch         = useRecondeskStore(s => s.runSearch)
  const clearSearch       = useRecondeskStore(s => s.clearSearch)
  const searchQuery       = useRecondeskStore(s => s.searchQuery)
  const searchResults     = useRecondeskStore(s => s.searchResults)
  const setActiveTarget   = useRecondeskStore(s => s.setActiveTarget)
  const setActiveTab      = useRecondeskStore(s => s.setActiveTab)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
    else clearSearch()
  }, [open, clearSearch])

  function handleSelect(targetId: string, tab?: 'board' | 'timeline' | 'ports') {
    setActiveTarget(targetId)
    if (tab) setActiveTab(tab)
    setOpen(false)
  }

  const grouped = {
    target:  searchResults.filter(r => r.type === 'target'),
    finding: searchResults.filter(r => r.type === 'finding'),
    note:    searchResults.filter(r => r.type === 'note'),
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: -8 }}
              transition={{ duration: 0.14 }}
              className="relative w-[520px] bg-[#12131a] border border-[#2a3347] rounded-xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3347]">
                <span className="text-[#4a5568] text-sm">⌕</span>
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={e => runSearch(e.target.value)}
                  placeholder="Search targets, IPs, CVEs, notes, subtasks…"
                  className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none"
                />
                <span className="text-[10px] text-[#4a5568] font-mono px-1.5 py-0.5 rounded bg-[#2a3347]">ESC</span>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {!searchQuery && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-[#4a5568]">Start typing to search targets, findings, notes</p>
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-[#4a5568]">No results for "{searchQuery}"</p>
                  </div>
                )}

                {grouped.target.length > 0 && (
                  <ResultGroup
                    label="Targets"
                    results={grouped.target}
                    onSelect={r => handleSelect(r.targetId)}
                  />
                )}
                {grouped.finding.length > 0 && (
                  <ResultGroup
                    label="Attack Cards"
                    results={grouped.finding}
                    onSelect={r => handleSelect(r.targetId, 'board')}
                  />
                )}
                {grouped.note.length > 0 && (
                  <ResultGroup
                    label="Notes"
                    results={grouped.note}
                    onSelect={r => handleSelect(r.targetId)}
                  />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="px-4 py-2 border-t border-[#2a3347] text-[9px] text-[#4a5568]">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} · ↑↓ navigate · Enter select
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

interface ResultGroupProps {
  label: string
  results: Array<{ targetId: string; targetName: string; text: string; matchField: string }>
  onSelect: (r: { targetId: string; targetName: string; text: string; matchField: string }) => void
}

function ResultGroup({ label, results, onSelect }: ResultGroupProps) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[9px] text-[#4a5568] uppercase tracking-widest font-semibold">{label}</p>
      {results.map((r, i) => (
        <button
          key={`${r.targetId}-${i}`}
          onClick={() => onSelect(r)}
          className="w-full text-left px-4 py-2.5 hover:bg-[#2a3347]/40 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#e2e8f0] flex-1 truncate group-hover:text-white">{r.text}</span>
            <span className="text-[9px] text-[#4a5568] flex-shrink-0">{r.targetName}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
