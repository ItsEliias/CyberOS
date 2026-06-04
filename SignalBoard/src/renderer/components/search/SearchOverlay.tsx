// SearchOverlay — Cmd+K full-text search with snippet context
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import type { FeedItem } from '../../../shared/types'

const RECENT_KEY = 'signalboard-recent-searches'
const MAX_RECENT = 8

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function saveRecent(searches: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(searches)) } catch { /* ignore */ }
}

const SNIPPET_RADIUS = 80

function getSnippet(text: string, query: string): string {
  const lc = text.toLowerCase()
  const qi = lc.indexOf(query.toLowerCase())
  if (qi === -1) return text.slice(0, 160)
  const start = Math.max(0, qi - SNIPPET_RADIUS)
  const end   = Math.min(text.length, qi + query.length + SNIPPET_RADIUS)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-accent/30 text-accent rounded-sm px-px">{part}</mark>
      : part
  )
}

interface SearchResult {
  item: FeedItem
  snippet: string
}

interface GroupedResult {
  sourceName: string
  results: SearchResult[]
}

function groupBySource(results: SearchResult[]): GroupedResult[] {
  const map = new Map<string, SearchResult[]>()
  results.forEach(r => {
    const arr = map.get(r.item.sourceName) ?? []
    arr.push(r)
    map.set(r.item.sourceName, arr)
  })
  return [...map.entries()].map(([sourceName, rs]) => ({ sourceName, results: rs }))
}

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const items         = useStore(s => s.items)
  const setSelectedId = useStore(s => s.setSelectedId)
  const setActiveView = useStore(s => s.setActiveView)
  const patchItem     = useStore(s => s.patchItem)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecent)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelected(0)
  }, [query])

  function addRecentSearch(q: string) {
    const clean = q.trim()
    if (!clean || clean.length < 2) return
    setRecentSearches(prev => {
      const next = [clean, ...prev.filter(s => s !== clean)].slice(0, MAX_RECENT)
      saveRecent(next)
      return next
    })
  }

  function clearRecentSearches() {
    setRecentSearches([])
    saveRecent([])
  }

  const results = useMemo((): SearchResult[] => {
    const q = query.trim()
    if (q.length < 2) return []
    const lq = q.toLowerCase()
    return items
      .filter(i => i.title.toLowerCase().includes(lq) || i.summary.toLowerCase().includes(lq))
      .slice(0, 50)
      .map(item => ({
        item,
        snippet: getSnippet(`${item.title} ${item.summary}`, q),
      }))
  }, [items, query])

  const grouped = useMemo(() => groupBySource(results), [results])
  const flatResults = useMemo(() => grouped.flatMap(g => g.results), [grouped])

  function selectItem(item: FeedItem) {
    addRecentSearch(query)
    setActiveView('feed')
    setSelectedId(item.id)
    if (!item.read) {
      window.electronAPI.markRead(item.id)
      patchItem(item.id, { read: true })
    }
    onClose()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && flatResults[selected]) selectItem(flatResults[selected].item)
  }

  let globalIndex = 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.14 }}
        className="w-[600px] max-h-[60vh] flex flex-col rounded-xl overflow-hidden shadow-glow"
        style={{ background: '#161b27', border: '1px solid rgba(42,51,71,0.8)' }}
        onKeyDown={handleKey}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <svg className="w-4 h-4 text-muted/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all feed items…"
            className="flex-1 bg-transparent text-sm text-text placeholder-muted/40 outline-none"
          />
          <span className="text-[10px] text-muted/40 px-1.5 py-0.5 bg-border/30 rounded font-mono">ESC</span>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted/40">No results for "{query}"</div>
          )}

          {query.length < 2 && recentSearches.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(139,148,158,0.4)' }}>Recent</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-[9px] transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(139,148,158,0.4)' }}
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map(s => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-[11px] px-2 py-0.5 rounded transition-colors"
                    style={{ background: 'rgba(42,51,71,0.4)', color: 'rgba(139,148,158,0.7)', border: '1px solid rgba(42,51,71,0.6)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,51,71,0.7)'; e.currentTarget.style.color = 'rgba(226,232,240,0.85)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(42,51,71,0.4)'; e.currentTarget.style.color = 'rgba(139,148,158,0.7)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.length < 2 && recentSearches.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted/30">Type at least 2 characters to search</div>
          )}

          <AnimatePresence>
            {grouped.map(group => (
              <div key={group.sourceName}>
                <div className="sticky top-0 px-4 py-1.5 border-b border-border/30 bg-bg/80 backdrop-blur-sm">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted/50">{group.sourceName}</span>
                  <span className="ml-2 text-[9px] font-mono text-muted/30">{group.results.length}</span>
                </div>
                {group.results.map(r => {
                  const gi = globalIndex++
                  const isSelected = gi === selected
                  const tierColors: Record<string, string> = { critical: '#ff6b6b', high: '#f85149', medium: '#d29922', low: '#4a5568' }
                  const tc = tierColors[r.item.relevanceTier] ?? '#4a5568'
                  return (
                    <button
                      key={r.item.id}
                      onClick={() => selectItem(r.item)}
                      className="w-full text-left px-4 py-2.5 border-b border-border/20 last:border-0 transition-all duration-100"
                      style={{ background: isSelected ? 'rgba(255,107,107,0.06)' : undefined }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="flex-shrink-0 mt-0.5 text-[8px] font-bold uppercase px-1 py-px rounded"
                          style={{ color: tc, background: `${tc}18`, border: `1px solid ${tc}30` }}
                        >
                          {r.item.relevanceTier}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug mb-1" style={{ color: isSelected ? '#e2e8f0' : 'rgba(226,232,240,0.85)' }}>
                            {highlightMatch(r.item.title, query.trim())}
                          </p>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(139,148,158,0.7)' }}>
                            {highlightMatch(r.snippet, query.trim())}
                          </p>
                        </div>
                        {!r.item.read && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1" style={{ background: '#ff6b6b' }} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/30 flex items-center gap-3 text-[10px]" style={{ color: 'rgba(139,148,158,0.4)' }}>
          {results.length > 0 && (
            <span className="font-mono">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          )}
          <div className="ml-auto flex items-center gap-2.5">
            {[
              { key: '↑↓', label: 'navigate' },
              { key: '↵', label: 'select' },
              { key: 'ESC', label: 'close' },
            ].map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1">
                <kbd className="px-1 py-px rounded text-[9px] font-mono" style={{ background: 'rgba(42,51,71,0.5)', border: '1px solid rgba(42,51,71,0.8)', color: 'rgba(139,148,158,0.6)' }}>{key}</kbd>
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
