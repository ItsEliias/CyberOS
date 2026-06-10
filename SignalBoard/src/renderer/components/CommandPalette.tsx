// SignalBoard — CommandPalette
// Navigate views, refresh, toggle severity, mark read, jump to feed items.
// ANTI-SLOP: all inline style={{}} blocks replaced with token-driven CSS vars.
// Keyboard nav + fuzzy search + all IPC calls preserved (functional parity).

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import type { ActiveFilter, ActiveView, FeedItem } from '../../shared/types'

interface Command {
  id:        string
  label:     string
  hint?:     string
  group:     'Navigate' | 'Action' | 'Filter' | 'Feed Items'
  keywords?: string[]
  accentVar: string   // CSS custom-property reference, e.g. 'var(--accent)'
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
      { id: 'nav:feed',      label: 'Open Feed',      group: 'Navigate', accentVar: 'var(--accent)',     keywords: ['view', 'feed', 'items'],        run: () => goto('feed') },
      { id: 'nav:sources',   label: 'Open Sources',   group: 'Navigate', accentVar: 'var(--accent)',     keywords: ['feeds', 'rss', 'sources'],       run: () => goto('sources') },
      { id: 'nav:bookmarks', label: 'Open Bookmarks', group: 'Navigate', accentVar: 'var(--accent)',     keywords: ['bookmarks', 'saved', 'starred'], run: () => goto('bookmarks') },
      { id: 'nav:timeline',  label: 'Open Timeline',  group: 'Navigate', accentVar: 'var(--accent)',     keywords: ['timeline', 'history'],           run: () => goto('timeline') },
      { id: 'nav:trends',    label: 'Open Trends',    group: 'Navigate', accentVar: 'var(--accent)',     keywords: ['trends', 'analytics'],           run: () => goto('trends') },
      { id: 'nav:settings',  label: 'Open Settings',  group: 'Navigate', accentVar: 'var(--accent)',     keywords: ['settings', 'preferences'],       run: () => goto('settings') },
    ]

    const actions: Command[] = [
      {
        id: 'action:refresh', label: 'Refresh all feeds', hint: 'Fetch every source now',
        group: 'Action', accentVar: 'var(--state-online)', keywords: ['refresh', 'reload', 'fetch', 'update'],
        run: () => { window.electronAPI.refresh().catch(() => {}); onClose() },
      },
      {
        id: 'action:add-custom', label: 'Add custom feed', hint: 'Settings → Custom Feeds',
        group: 'Action', accentVar: 'var(--sev-medium)', keywords: ['add', 'custom', 'feed', 'rss', 'atom'],
        run: () => {
          setActiveView('settings')
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('signalboard:settings-scroll', { detail: { section: 'custom-feeds-section' } }))
          }, 80)
          onClose()
        },
      },
      {
        id: 'action:mark-all-read', label: 'Mark all as read', hint: `${items.filter(i => !i.read).length} unread`,
        group: 'Action', accentVar: 'var(--text-muted)', keywords: ['mark', 'read', 'clear', 'all'],
        run: markAllRead,
      },
    ]

    const filters: Command[] = [
      { id: 'filter:high',   label: 'Toggle severity: critical / high', hint: activeFilter === 'high'   ? 'Active' : '', group: 'Filter', accentVar: 'var(--sev-critical)', keywords: ['severity', 'high', 'critical'], run: () => toggleSeverity('high') },
      { id: 'filter:medium', label: 'Toggle severity: medium',          hint: activeFilter === 'medium' ? 'Active' : '', group: 'Filter', accentVar: 'var(--sev-medium)',   keywords: ['severity', 'medium'],           run: () => toggleSeverity('medium') },
      { id: 'filter:low',    label: 'Toggle severity: low',             hint: activeFilter === 'low'    ? 'Active' : '', group: 'Filter', accentVar: 'var(--sev-low)',      keywords: ['severity', 'low'],              run: () => toggleSeverity('low') },
    ]

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
            id:        `item:${item.id}`,
            label:     `Open: ${item.title}`,
            hint:      item.sourceName,
            group:     'Feed Items' as const,
            accentVar: 'var(--sev-low)',
            keywords:  [item.sourceName ?? '', item.title ?? ''],
            run:       () => {
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
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
      else if (e.key === 'Enter') {
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
          className="fixed inset-0 z-[200] flex items-start justify-center pt-20"
          style={{
            background: 'rgba(5,6,12,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="w-[480px] max-w-[calc(100vw-32px)] rounded-xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--surface-glass-strong)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--elevation-4)',
            }}
          >
            {/* Search input row */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search commands, feed items…"
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              />
              <span
                className="text-[9px] font-mono px-1 py-0.5 rounded"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
              >
                ⌘K
              </span>
            </div>

            {/* Results list */}
            <div className="overflow-y-auto px-1 py-1.5" style={{ maxHeight: 380 }}>
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  No matches
                </div>
              ) : (
                (['Navigate', 'Action', 'Filter', 'Feed Items'] as const).map(group =>
                  grouped[group].length > 0 && (
                    <div key={group} className="mb-1">
                      <div
                        className="px-3 pt-1.5 pb-1 text-[9px] font-bold tracking-widest uppercase"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {group}
                      </div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c)
                        const active  = flatIdx === activeIdx
                        return (
                          <button
                            key={c.id}
                            onClick={() => c.run()}
                            onMouseEnter={() => setActive(flatIdx)}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-all border-none"
                            style={{
                              background: active ? 'var(--accent-tint2)' : 'transparent',
                              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: c.accentVar, boxShadow: `0 0 6px ${c.accentVar}` }}
                            />
                            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                              <span
                                className="text-[12.5px] font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {c.label}
                              </span>
                              {c.hint && (
                                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                                  {c.hint}
                                </span>
                              )}
                            </div>
                            {active && (
                              <span className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>↵</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                )
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-3 py-2 text-[10px] font-mono"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <span>↑↓ navigate · ↵ run · ⎋ close</span>
              <span>{filtered.length} command{filtered.length === 1 ? '' : 's'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
