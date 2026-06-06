// SignalBoard — ⌘K Command Palette
// Self-contained palette: navigate views, refresh, toggle severity, mark read,
// jump to feed items by title. Adapted from the Launcher reference.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { ActiveFilter, ActiveView, FeedItem } from '../../shared/types'

const ACCENT = '#ff6b6b'

interface Command {
  id:        string
  label:     string
  hint?:     string
  group:     'Navigate' | 'Action' | 'Filter' | 'Feed Items'
  keywords?: string[]
  accent:    string
  run:       () => Promise<void> | void
}

interface Props {
  open:    boolean
  onClose: () => void
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

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]      = useState('')
  const [activeIdx, setActive] = useState(0)
  const inputRef               = useRef<HTMLInputElement | null>(null)

  const items           = useStore(s => s.items)
  const activeFilter    = useStore(s => s.activeFilter)
  const setActiveView   = useStore(s => s.setActiveView)
  const setActiveFilter = useStore(s => s.setActiveFilter)
  const setSelectedId   = useStore(s => s.setSelectedId)
  const patchItem       = useStore(s => s.patchItem)

  function goto(view: ActiveView) {
    setActiveView(view)
    onClose()
  }

  function toggleSeverity(level: ActiveFilter) {
    setActiveFilter(activeFilter === level ? 'all' : level)
    onClose()
  }

  async function markAllRead() {
    const unread = items.filter(i => !i.read)
    await Promise.all(unread.map(i =>
      window.electronAPI.markRead(i.id).catch(() => {})
    ))
    unread.forEach(i => patchItem(i.id, { read: true }))
    onClose()
  }

  // ── Build command list ───────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'nav:feed',      label: 'Open Feed',      group: 'Navigate', accent: ACCENT, keywords: ['view', 'feed', 'items'],     run: () => goto('feed') },
      { id: 'nav:sources',   label: 'Open Sources',   group: 'Navigate', accent: ACCENT, keywords: ['feeds', 'rss', 'sources'],    run: () => goto('sources') },
      { id: 'nav:bookmarks', label: 'Open Bookmarks', group: 'Navigate', accent: ACCENT, keywords: ['bookmarks', 'saved', 'starred'], run: () => goto('bookmarks') },
      { id: 'nav:timeline',  label: 'Open Timeline',  group: 'Navigate', accent: ACCENT, keywords: ['timeline', 'history'],        run: () => goto('timeline') },
      { id: 'nav:trends',    label: 'Open Trends',    group: 'Navigate', accent: ACCENT, keywords: ['trends', 'analytics'],        run: () => goto('trends') },
      { id: 'nav:settings',  label: 'Open Settings',  group: 'Navigate', accent: ACCENT, keywords: ['settings', 'preferences'],    run: () => goto('settings') },
    ]

    const actions: Command[] = [
      {
        id: 'action:refresh', label: 'Refresh all feeds', hint: 'Fetch every source now',
        group: 'Action', accent: '#3fb950', keywords: ['refresh', 'reload', 'fetch', 'update'],
        run: () => { window.electronAPI.refresh().catch(() => {}); onClose() },
      },
      {
        id: 'action:add-custom', label: 'Add custom feed', hint: 'Settings → Custom Feeds',
        group: 'Action', accent: '#d29922', keywords: ['add', 'custom', 'feed', 'rss', 'atom'],
        run: () => {
          setActiveView('settings')
          // Defer until settings view mounts
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('signalboard:settings-scroll', { detail: { section: 'custom-feeds-section' } }))
          }, 80)
          onClose()
        },
      },
      {
        id: 'action:mark-all-read', label: 'Mark all as read', hint: `${items.filter(i => !i.read).length} unread`,
        group: 'Action', accent: '#8b949e', keywords: ['mark', 'read', 'clear', 'all'],
        run: markAllRead,
      },
    ]

    const filters: Command[] = [
      { id: 'filter:high',   label: 'Toggle severity: critical / high', hint: activeFilter === 'high'   ? 'Active' : '', group: 'Filter', accent: '#ff6b6b', keywords: ['severity', 'high', 'critical'], run: () => toggleSeverity('high') },
      { id: 'filter:medium', label: 'Toggle severity: medium',          hint: activeFilter === 'medium' ? 'Active' : '', group: 'Filter', accent: '#d29922', keywords: ['severity', 'medium'],            run: () => toggleSeverity('medium') },
      { id: 'filter:low',    label: 'Toggle severity: low',             hint: activeFilter === 'low'    ? 'Active' : '', group: 'Filter', accent: '#4a9eff', keywords: ['severity', 'low'],               run: () => toggleSeverity('low') },
    ]

    // Dynamic: feed items matching query
    const feedItems: Command[] = query.trim()
      ? items
          .map<{ item: FeedItem; score: number }>(item => ({
            item,
            score: fuzzyScore(query, item.title || ''),
          }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(({ item }) => ({
            id:       `item:${item.id}`,
            label:    `Open: ${item.title}`,
            hint:     item.sourceName,
            group:    'Feed Items',
            accent:   '#7bb8ff',
            keywords: [item.sourceName ?? '', item.title ?? ''],
            run:      () => {
              setActiveView('feed')
              setSelectedId(item.id)
              if (!item.read) {
                window.electronAPI.markRead(item.id).catch(() => {})
                patchItem(item.id, { read: true })
              }
              onClose()
            },
          }))
      : []

    return [...nav, ...actions, ...filters, ...feedItems]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeFilter, query])

  // Filter + score
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

  // Reset on open + focus
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  // Keyboard nav
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
    const g: Record<string, Command[]> = { Navigate: [], Action: [], Filter: [], 'Feed Items': [] }
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
                placeholder="Search commands, feed items…"
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
                (['Navigate', 'Action', 'Filter', 'Feed Items'] as const).map(group => (
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
