// NetLab — SearchModal.tsx — Cmd+K global search

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetLabStore } from '../store'
import type { ActiveView } from '../store'

interface SearchResult {
  type: 'lab' | 'step' | 'snippet' | 'reference'
  id: string
  title: string
  subtitle: string
  action: () => void
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery]   = useState('')
  const [focused, setFocused] = useState(0)
  const inputRef            = useRef<HTMLInputElement>(null)

  const labs        = useNetLabStore(s => s.labs)
  const snippets    = useNetLabStore(s => s.snippets)
  const setActiveLab   = useNetLabStore(s => s.setActiveLab)
  const startLabTimer  = useNetLabStore(s => s.startLabTimer)
  const setActiveView  = useNetLabStore(s => s.setActiveView)

  useEffect(() => {
    if (open) {
      setQuery('')
      setFocused(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function navigate(view: ActiveView) { setActiveView(view); onClose() }

  const results: SearchResult[] = query.trim().length < 2 ? [] : [
    // Labs
    ...labs
      .filter(l => l.title.toLowerCase().includes(query.toLowerCase()) || l.description.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(l => ({
        type: 'lab' as const,
        id: `lab-${l.id}`,
        title: l.title,
        subtitle: `${l.category} — ${l.vendor} — Difficulty ${'★'.repeat(l.difficulty)}`,
        action: () => { setActiveLab(l); startLabTimer(); navigate('labs') },
      })),
    // Lab steps
    ...labs.flatMap(l =>
      l.steps
        .filter(s => s.title.toLowerCase().includes(query.toLowerCase()) ||
          (s.command ?? '').toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2)
        .map(s => ({
          type: 'step' as const,
          id: `step-${l.id}-${s.id}`,
          title: `${l.title} — Step ${s.number}: ${s.title}`,
          subtitle: s.command ? s.command.split('\n')[0] : s.description,
          action: () => { setActiveLab(l); startLabTimer(); navigate('labs') },
        }))
    ).slice(0, 4),
    // Snippets
    ...snippets
      .filter(s => s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.command.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .map(s => ({
        type: 'snippet' as const,
        id: `snip-${s.id}`,
        title: s.title,
        subtitle: s.command.split('\n')[0],
        action: () => navigate('snippets'),
      })),
  ]

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    if (e.key === 'Enter' && results[focused]) { results[focused].action() }
    if (e.key === 'Escape')     { onClose() }
  }

  const typeColor: Record<string, string> = {
    lab: '#5ec4ff', step: '#3fb950', snippet: '#d29922', reference: '#b44fff',
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-lg border shadow-2xl overflow-hidden"
            style={{ background: '#0f1117', borderColor: '#2a3347' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
              <span className="text-text-muted text-sm">⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setFocused(0) }}
                onKeyDown={handleKeyDown}
                placeholder="Search labs, steps, snippets..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
              />
              <kbd className="text-2xs px-1.5 py-0.5 rounded text-text-muted"
                style={{ background: '#161b27', border: '1px solid #2a3347' }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            {query.trim().length >= 2 && (
              <div className="max-h-96 overflow-y-auto py-2">
                {results.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">No results for "{query}"</p>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={r.action}
                      onMouseEnter={() => setFocused(i)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={i === focused ? { background: 'rgba(94,196,255,0.08)' } : {}}
                    >
                      <span
                        className="text-2xs px-1.5 py-0.5 rounded shrink-0 font-medium uppercase"
                        style={{ background: `${typeColor[r.type]}18`, color: typeColor[r.type], border: `1px solid ${typeColor[r.type]}30` }}
                      >
                        {r.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{r.title}</p>
                        <p className="text-2xs text-text-muted truncate font-mono-code">{r.subtitle}</p>
                      </div>
                      {i === focused && <span className="text-2xs text-text-muted shrink-0">↵ Open</span>}
                    </button>
                  ))
                )}
              </div>
            )}

            {query.trim().length < 2 && (
              <div className="py-4 px-4">
                <p className="text-2xs text-text-muted uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Labs', view: 'labs' as ActiveView, icon: '📋' },
                    { label: 'Reference', view: 'reference' as ActiveView, icon: '📖' },
                    { label: 'Snippets', view: 'snippets' as ActiveView, icon: '💻' },
                    { label: 'Progress', view: 'progress' as ActiveView, icon: '📊' },
                  ].map(({ label, view, icon }) => (
                    <button
                      key={view}
                      onClick={() => navigate(view)}
                      className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors"
                      style={{ background: '#161b27', color: '#8b949e', border: '1px solid #2a3347' }}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
