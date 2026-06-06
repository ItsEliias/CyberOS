// ReconDesk — ⌘K Command Palette
// Action palette for navigation + target ops. Distinct from GlobalSearch,
// which is content-search (targets/findings/notes). This is verbs.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecondeskStore } from '../stores/useRecondeskStore'
import type { ActiveTab } from '../stores/useRecondeskStore'

const ACCENT = '#d29922'

interface Command {
  id:        string
  label:     string
  hint?:     string
  group:     'Action' | 'Navigation' | 'Targets'
  keywords?: string[]
  run:       () => void
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
  let ti = 0, matched = 0
  for (const c of q) {
    const i = t.indexOf(c, ti)
    if (i === -1) return 0
    matched++
    ti = i + 1
  }
  return matched
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]       = useState('')
  const [activeIdx, setActive]  = useState(0)
  const inputRef                = useRef<HTMLInputElement | null>(null)

  const targets             = useRecondeskStore(s => s.targets)
  const activeTargetId      = useRecondeskStore(s => s.activeTargetId)
  const setActiveTarget     = useRecondeskStore(s => s.setActiveTarget)
  const setActiveTab        = useRecondeskStore(s => s.setActiveTab)
  const setNewTargetModal   = useRecondeskStore(s => s.setNewTargetModal)
  const setImportXmlModal   = useRecondeskStore(s => s.setImportXmlModal)
  const setSettingsOpen     = useRecondeskStore(s => s.setSettingsOpen)
  const exportTargetJSON    = useRecondeskStore(s => s.exportTargetJSON)
  const showToast           = useRecondeskStore(s => s.showToast)

  function navigateTab(tab: ActiveTab) {
    setSettingsOpen(false)
    setActiveTab(tab)
    onClose()
  }

  // ── Build command list ───────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = []

    // Actions
    list.push({
      id: 'action:new-target',
      label: 'New target',
      hint: 'Add a new target',
      group: 'Action',
      keywords: ['new', 'add', 'target', 'create'],
      run: () => { setNewTargetModal(true); onClose() },
    })

    list.push({
      id: 'action:port-scan',
      label: 'Run port scan',
      hint: 'Import nmap XML',
      group: 'Action',
      keywords: ['port', 'scan', 'nmap', 'run', 'import'],
      run: () => {
        if (!activeTargetId) {
          showToast('Select a target first', 'error')
        } else {
          setImportXmlModal(true)
        }
        onClose()
      },
    })

    if (activeTargetId) {
      list.push({
        id: 'action:export',
        label: 'Export current target',
        hint: 'JSON export',
        group: 'Action',
        keywords: ['export', 'save', 'download', 'json'],
        run: () => { exportTargetJSON(activeTargetId); onClose() },
      })
    }

    // Navigation — top-level tabs
    list.push(
      { id: 'nav:overview',   label: 'Open Overview',     group: 'Navigation', keywords: ['overview'],     run: () => navigateTab('overview') },
      { id: 'nav:ports',      label: 'Open Ports',        group: 'Navigation', keywords: ['ports'],        run: () => navigateTab('ports') },
      { id: 'nav:credentials',label: 'Open Credentials',  group: 'Navigation', keywords: ['credentials', 'creds'], run: () => navigateTab('credentials') },
      { id: 'nav:board',      label: 'Open Attack Board', group: 'Navigation', keywords: ['attack', 'board', 'kanban'], run: () => navigateTab('board') },
      { id: 'nav:timeline',   label: 'Open Timeline',     group: 'Navigation', keywords: ['timeline', 'history'], run: () => navigateTab('timeline') },
      { id: 'nav:export',     label: 'Open Export',       group: 'Navigation', keywords: ['export'],       run: () => navigateTab('export') },
      { id: 'nav:calendar',   label: 'Open Calendar',     group: 'Navigation', keywords: ['calendar', 'schedule'], run: () => navigateTab('calendar') },
      { id: 'nav:settings',   label: 'Open Settings',     group: 'Navigation', keywords: ['settings', 'preferences'], run: () => { setSettingsOpen(true); onClose() } },
    )

    // Dynamic: filter targets by name + IP → "Open: <name> (<ip>)"
    for (const t of targets) {
      list.push({
        id:       `target:${t.id}`,
        label:    `Open: ${t.name} (${t.ip})`,
        hint:     t.platform,
        group:    'Targets',
        keywords: [t.name, t.ip, t.platform, t.os, ...(t.tags || []), 'open'],
        run:      () => { setActiveTarget(t.id); onClose() },
      })
    }

    return list
  }, [targets, activeTargetId, setActiveTarget, setActiveTab, setNewTargetModal, setImportXmlModal, setSettingsOpen, exportTargetJSON, showToast, onClose])

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
      if (e.key === 'Escape')        { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown'){ e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)) }
      else if (e.key === 'ArrowUp')  { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
      else if (e.key === 'Enter')    { e.preventDefault(); const cmd = filtered[activeIdx]; if (cmd) cmd.run() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, activeIdx, onClose])

  const grouped = useMemo(() => {
    const g: Record<string, Command[]> = { Action: [], Navigation: [], Targets: [] }
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
            paddingTop: 96,
          }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              width: 520, maxWidth: 'calc(100vw - 32px)',
              background: '#12131a',
              border: '1px solid rgba(210,153,34,0.35)',
              borderRadius: 12,
              boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 40px ${ACCENT}18`,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Input */}
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid rgba(210,153,34,0.18)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Run a command or open a target…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e6edf3', fontSize: 14, fontFamily: 'inherit',
                }}
              />
              <span style={{
                fontSize: 9, color: '#6b7280', fontFamily: 'JetBrains Mono, monospace',
                border: '1px solid rgba(210,153,34,0.3)', padding: '1px 5px', borderRadius: 4,
              }}>
                ⌘K
              </span>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>
                  No matches
                </div>
              ) : (
                (['Action', 'Navigation', 'Targets'] as const).map(group => (
                  grouped[group].length > 0 && (
                    <div key={group} style={{ marginBottom: 4 }}>
                      <div style={{
                        padding: '6px 12px 4px',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#4a5568',
                      }}>{group}</div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c)
                        const active = flatIdx === activeIdx
                        return (
                          <button
                            key={c.id}
                            onClick={() => c.run()}
                            onMouseEnter={() => setActive(flatIdx)}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10,
                              background: active ? 'rgba(210,153,34,0.10)' : 'transparent',
                              border: 'none', cursor: 'pointer',
                              borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <span style={{
                              width: 7, height: 7, borderRadius: 99,
                              background: ACCENT, flexShrink: 0,
                              boxShadow: `0 0 6px ${ACCENT}80`,
                            }} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 12.5, color: '#e6edf3', fontWeight: 500,
                                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.label}
                              </span>
                              {c.hint && (
                                <span style={{ fontSize: 10, color: '#6b7280',
                                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.hint}
                                </span>
                              )}
                            </div>
                            {active && (
                              <span style={{ fontSize: 9, color: ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>
                                ↵
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid rgba(210,153,34,0.18)',
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
