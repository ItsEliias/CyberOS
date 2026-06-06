// PlaybookStudio — ⌘K Command Palette
// Self-contained palette: navigate views, new playbook, run / export current,
// open templates, jump to playbooks by name.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, type View } from '../store'
import type { Playbook } from '@shared/types'

const ACCENT = '#4a9eff'

interface Command {
  id:        string
  label:     string
  hint?:     string
  group:     'Navigate' | 'Action' | 'Playbooks'
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

// Lightweight toast for stubbed actions
function showToast(message: string) {
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText = [
    'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:300', 'padding:10px 16px',
    'background:rgba(13,14,24,0.96)',
    `border:1px solid ${ACCENT}66`,
    'border-radius:8px', 'color:#e6edf3',
    'font-size:12px', 'font-family:inherit',
    `box-shadow:0 8px 32px ${ACCENT}33`,
    'opacity:0', 'transition:opacity 180ms ease',
  ].join(';')
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 220)
  }, 2200)
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]      = useState('')
  const [activeIdx, setActive] = useState(0)
  const inputRef               = useRef<HTMLInputElement | null>(null)

  const playbooks         = useStore(s => s.playbooks)
  const activeRun         = useStore(s => s.activeRun)
  const activePlaybook    = useStore(s => s.activePlaybook)
  const setView           = useStore(s => s.setView)
  const setActivePlaybook = useStore(s => s.setActivePlaybook)
  const setCategoryFilter = useStore(s => s.setCategoryFilter)
  const setActiveRun      = useStore(s => s.setActiveRun)

  function goto(view: View) {
    setView(view)
    onClose()
  }

  function handleNewPlaybook() {
    const now = new Date().toISOString()
    setActivePlaybook({
      id:          `custom-${Date.now()}`,
      name:        'New Playbook',
      description: '',
      category:    'custom',
      tags:        [],
      version:     '1.0',
      createdAt:   now,
      updatedAt:   now,
      steps:       [],
      isBuiltIn:   false,
    })
    setView('editor')
    onClose()
  }

  async function handleRunCurrent() {
    if (!activePlaybook) { showToast('No playbook is currently active'); onClose(); return }
    const res = await window.electronAPI.startRun(activePlaybook.id, activePlaybook.variables)
    if (res.ok && res.run) {
      setActiveRun(res.run)
      setView('run')
    } else {
      showToast(`Failed to start run: ${res.error ?? 'unknown'}`)
    }
    onClose()
  }

  async function handleExportToReportForge() {
    if (!activeRun) {
      showToast('No active run to export — start a playbook run first')
      onClose()
      return
    }
    const res = await window.electronAPI.exportRunReport(activeRun.id)
    if (res.ok) showToast('Sent to ReportForge pending queue')
    else showToast(`Export failed: ${res.error ?? 'unknown'}`)
    onClose()
  }

  async function handleCopyRunToClipboard() {
    if (!activeRun) {
      showToast('No active run — start a playbook run first')
      onClose()
      return
    }
    const res = await window.electronAPI.exportRunReport(activeRun.id)
    if (!res.ok || !res.report) {
      showToast(`Copy failed: ${res.error ?? 'no report'}`)
      onClose()
      return
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(res.report, null, 2))
      showToast('Run report copied to clipboard')
    } catch (e) {
      showToast(`Clipboard write failed: ${(e as Error).message}`)
    }
    onClose()
  }

  function handleOpenTemplates() {
    setCategoryFilter('templates')
    setView('library')
    onClose()
  }

  // ── Build command list ─────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'nav:library',  label: 'Open Library',  group: 'Navigate', accent: ACCENT, keywords: ['library', 'playbooks'], run: () => goto('library') },
      { id: 'nav:editor',   label: 'Open Editor',   group: 'Navigate', accent: ACCENT, keywords: ['editor', 'edit'],        run: () => goto('editor') },
      { id: 'nav:run',      label: 'Open Run',      group: 'Navigate', accent: ACCENT, keywords: ['run', 'active'],         run: () => goto('run') },
      { id: 'nav:history',  label: 'Open History',  group: 'Navigate', accent: ACCENT, keywords: ['history', 'past'],       run: () => goto('history') },
      { id: 'nav:settings', label: 'Open Settings', group: 'Navigate', accent: ACCENT, keywords: ['settings', 'preferences'], run: () => goto('settings') },
    ]

    const actions: Command[] = [
      {
        id: 'action:new', label: 'New playbook', hint: 'Blank editor',
        group: 'Action', accent: '#3fb950', keywords: ['new', 'create', 'blank'],
        run: handleNewPlaybook,
      },
      {
        id: 'action:templates', label: 'Open templates', hint: 'Built-in library',
        group: 'Action', accent: '#d29922', keywords: ['templates', 'builtin', 'starter'],
        run: handleOpenTemplates,
      },
      {
        id: 'action:run-current', label: 'Run current playbook',
        hint: activePlaybook ? activePlaybook.name : 'No active playbook',
        group: 'Action', accent: '#7bb8ff', keywords: ['run', 'execute', 'start'],
        run: handleRunCurrent,
      },
      {
        id: 'action:export-reportforge', label: 'Export current playbook to ReportForge',
        hint: activeRun ? activeRun.playbookName : 'No active run',
        group: 'Action', accent: '#f78166', keywords: ['export', 'report', 'reportforge'],
        run: handleExportToReportForge,
      },
      {
        id: 'action:copy-run-clipboard', label: 'Copy current run report to clipboard',
        hint: activeRun ? `${activeRun.playbookName} — JSON` : 'No active run',
        group: 'Action', accent: '#a371f7',
        keywords: ['copy', 'clipboard', 'json', 'export', 'run'],
        run: handleCopyRunToClipboard,
      },
    ]

    const pbs: Command[] = query.trim()
      ? playbooks
          .map<{ p: Playbook; score: number }>(p => ({ p, score: fuzzyScore(query, p.name) }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(({ p }) => ({
            id:       `pb:${p.id}`,
            label:    `Open: ${p.name}`,
            hint:     p.isBuiltIn ? 'Template' : 'Custom',
            group:    'Playbooks',
            accent:   p.isBuiltIn ? '#d29922' : '#3fb950',
            keywords: [p.name, p.description, ...p.tags],
            run:      () => {
              setActivePlaybook(p)
              setView('editor')
              onClose()
            },
          }))
      : []

    return [...nav, ...actions, ...pbs]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, playbooks, activeRun, activePlaybook])

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
    const g: Record<string, Command[]> = { Navigate: [], Action: [], Playbooks: [] }
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
                placeholder="Search commands, playbooks…"
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
                (['Navigate', 'Action', 'Playbooks'] as const).map(group => (
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
