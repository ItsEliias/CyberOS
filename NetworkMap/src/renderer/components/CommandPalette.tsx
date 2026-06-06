// NetworkMap — ⌘K Command Palette
// Self-contained palette: navigate views, new graph, import scan,
// clear filters, toggle minimap, open graphs from library.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GraphSummary, NetworkGraph } from '@shared/types'

const ACCENT = '#d29922'

type ViewTarget = 'library' | 'settings'

interface Command {
  id:        string
  label:     string
  hint?:     string
  group:     'Navigate' | 'Action' | 'Toggle' | 'Graphs'
  keywords?: string[]
  accent:    string
  run:       () => Promise<void> | void
}

interface Props {
  open:          boolean
  onClose:       () => void
  savedGraphs:   GraphSummary[]
  onGoto:        (view: ViewTarget) => void
  onNewGraph:    () => void
  onOpenImport:  () => void
  onOpenGraph:   (graph: NetworkGraph) => void
}

function fuzzyScore(query: string, target: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return 100 - t.indexOf(q)
  let ti = 0
  let matched = 0
  for (const c of q) {
    const i = t.indexOf(c, ti)
    if (i === -1) return 0
    matched++
    ti = i + 1
  }
  return matched
}

export default function CommandPalette({
  open, onClose, savedGraphs, onGoto, onNewGraph, onOpenImport, onOpenGraph,
}: Props) {
  const [query, setQuery]      = useState('')
  const [activeIdx, setActive] = useState(0)
  const inputRef               = useRef<HTMLInputElement | null>(null)

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'nav:library',  label: 'Open Library',  group: 'Navigate', accent: ACCENT, keywords: ['library', 'graphs', 'home'],     run: () => { onGoto('library');  onClose() } },
      { id: 'nav:settings', label: 'Open Settings', group: 'Navigate', accent: ACCENT, keywords: ['settings', 'preferences'],        run: () => { onGoto('settings'); onClose() } },
    ]

    const actions: Command[] = [
      {
        id: 'action:new', label: 'New empty graph', hint: 'Blank canvas',
        group: 'Action', accent: '#3fb950', keywords: ['new', 'create', 'empty', 'graph', 'blank'],
        run: () => { onNewGraph(); onClose() },
      },
      {
        id: 'action:import', label: 'Import scan', hint: 'nmap XML or ReconDesk',
        group: 'Action', accent: '#4a9eff', keywords: ['import', 'scan', 'nmap', 'recondesk', 'xml'],
        run: () => { onOpenImport(); onClose() },
      },
      {
        id: 'action:clear-filters', label: 'Clear all filters', hint: 'Resets active canvas filters',
        group: 'Action', accent: '#8b949e', keywords: ['clear', 'reset', 'filters', 'filter'],
        run: () => {
          window.dispatchEvent(new CustomEvent('networkmap:clear-filters'))
          onClose()
        },
      },
    ]

    const toggles: Command[] = [
      {
        id: 'toggle:minimap', label: 'Toggle minimap', hint: 'Show / hide minimap',
        group: 'Toggle', accent: ACCENT, keywords: ['minimap', 'overview', 'toggle'],
        run: () => {
          window.dispatchEvent(new CustomEvent('networkmap:toggle-minimap'))
          onClose()
        },
      },
    ]

    const graphs: Command[] = query.trim()
      ? savedGraphs
          .map<{ g: GraphSummary; score: number }>(g => ({ g, score: fuzzyScore(query, g.name) }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(({ g }) => ({
            id:       `graph:${g.id}`,
            label:    `Open graph: ${g.name}`,
            hint:     `${g.nodeCount} nodes`,
            group:    'Graphs',
            accent:   '#7bb8ff',
            keywords: [g.name],
            run:      async () => {
              const full = await window.electronAPI.loadGraph(g.id)
              if (full) onOpenGraph(full)
              onClose()
            },
          }))
      : []

    return [...nav, ...actions, ...toggles, ...graphs]
  }, [query, savedGraphs, onGoto, onNewGraph, onOpenImport, onOpenGraph, onClose])

  const filtered = useMemo(() => {
    if (!query) return commands
    return commands
      .map(c => {
        const text = [c.label, c.hint, ...(c.keywords || [])].filter(Boolean).join(' ')
        return { c, score: fuzzyScore(query, text) }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c)
  }, [query, commands])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive(i => Math.min(filtered.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[activeIdx]
        if (cmd) cmd.run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, activeIdx, onClose])

  const grouped = useMemo(() => {
    const g: Record<string, Command[]> = { Navigate: [], Action: [], Toggle: [], Graphs: [] }
    for (const c of filtered) g[c.group].push(c)
    return g
  }, [filtered])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,6,12,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 80,
          }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              width: 480, maxWidth: 'calc(100vw - 32px)',
              background: 'rgba(13,14,24,0.98)',
              border: '1px solid rgba(42,51,71,0.6)',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid rgba(42,51,71,0.5)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search commands, graphs…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e6edf3', fontSize: 14, fontFamily: 'inherit',
                }}
              />
              <span style={{
                fontSize: 9, color: '#4a5568', fontFamily: 'JetBrains Mono, monospace',
                border: '1px solid rgba(42,51,71,0.6)', padding: '1px 5px', borderRadius: 4,
              }}>⌘K</span>
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>
                  No matches
                </div>
              ) : (
                (['Navigate', 'Action', 'Toggle', 'Graphs'] as const).map(group => (
                  grouped[group].length > 0 && (
                    <div key={group} style={{ marginBottom: 4 }}>
                      <div style={{
                        padding: '6px 12px 4px',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#4a5568',
                      }}>{group}</div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c)
                        const active  = flatIdx === activeIdx
                        return (
                          <button
                            key={c.id}
                            onClick={() => c.run()}
                            onMouseEnter={() => setActive(flatIdx)}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10,
                              background: active ? `${ACCENT}1a` : 'transparent',
                              border: 'none', cursor: 'pointer',
                              borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <span style={{
                              width: 7, height: 7, borderRadius: 99,
                              background: c.accent, flexShrink: 0,
                              boxShadow: `0 0 6px ${c.accent}60`,
                            }} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{
                                fontSize: 12.5, color: '#e6edf3', fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{c.label}</span>
                              {c.hint && <span style={{ fontSize: 10, color: '#6b7280' }}>{c.hint}</span>}
                            </div>
                            {active && (
                              <span style={{ fontSize: 9, color: ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>↵</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                ))
              )}
            </div>

            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid rgba(42,51,71,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#4a5568',
            }}>
              <span>↑↓ navigate · ↵ run · ⎋ close</span>
              <span>{filtered.length} command{filtered.length === 1 ? '' : 's'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
