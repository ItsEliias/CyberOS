// NetLab — ⌘K Command Palette
// Action palette for navigation + lab control. Distinct from SearchModal,
// which is content-search (labs/steps/snippets). This is verbs.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetLabStore } from '../store'
import type { ActiveView } from '../store'

const ACCENT = '#a78bfa'

interface Command {
  id:          string
  label:       string
  hint?:       string
  group:       'Action' | 'Navigation' | 'Labs'
  keywords?:   string[]
  run:         () => void
}

interface Props {
  open:    boolean
  onClose: () => void
}

// Subsequence fuzzy match — 0 = no match, higher = better
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
  const [query, setQuery]     = useState('')
  const [activeIdx, setActive] = useState(0)
  const inputRef              = useRef<HTMLInputElement | null>(null)

  // Pull state lazily so we always read the current store snapshot
  const labs           = useNetLabStore(s => s.labs)
  const activeLab      = useNetLabStore(s => s.activeLab)
  const activeStepIndex = useNetLabStore(s => s.activeStepIndex)
  const labStartTime   = useNetLabStore(s => s.labStartTime)
  const setActiveLab   = useNetLabStore(s => s.setActiveLab)
  const setActiveView  = useNetLabStore(s => s.setActiveView)
  const setActiveStepIndex = useNetLabStore(s => s.setActiveStepIndex)
  const startLabTimer  = useNetLabStore(s => s.startLabTimer)
  const clearLabTimer  = useNetLabStore(s => s.clearLabTimer)
  const updateStepResult = useNetLabStore(s => s.updateStepResult)

  function navigate(view: ActiveView) {
    setActiveView(view)
    onClose()
  }

  // ── Build command list ───────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = []

    // Lab control
    list.push({
      id: 'action:new-lab',
      label: 'New lab',
      hint: 'Browse labs',
      group: 'Action',
      keywords: ['new', 'create', 'lab', 'start'],
      run: () => navigate('labs'),
    })

    if (activeLab) {
      // Start / pause / resume
      if (labStartTime === null) {
        list.push({
          id: 'action:start',
          label: `Start lab: ${activeLab.title}`,
          hint: 'Begin timer',
          group: 'Action',
          keywords: ['start', 'begin', 'play', 'run'],
          run: () => { startLabTimer(); onClose() },
        })
      } else {
        list.push({
          id: 'action:pause',
          label: `Pause lab: ${activeLab.title}`,
          hint: 'Stop timer',
          group: 'Action',
          keywords: ['pause', 'stop'],
          run: () => { clearLabTimer(); onClose() },
        })
        list.push({
          id: 'action:resume',
          label: `Resume lab: ${activeLab.title}`,
          hint: 'Restart timer',
          group: 'Action',
          keywords: ['resume', 'continue', 'play'],
          run: () => { startLabTimer(); onClose() },
        })
      }

      // Mark step complete
      const step = activeLab.steps[activeStepIndex]
      if (step) {
        list.push({
          id: 'action:complete-step',
          label: `Mark step ${step.number} complete`,
          hint: step.title,
          group: 'Action',
          keywords: ['complete', 'done', 'step', 'mark', 'finish'],
          run: () => { updateStepResult(activeLab.id, step.id, true); onClose() },
        })
      }

      list.push({
        id: 'nav:active',
        label: 'Open active lab',
        hint: activeLab.title,
        group: 'Navigation',
        keywords: ['active', 'current', 'lab', 'open'],
        run: () => navigate('labs'),
      })
    }

    // Top-level views
    list.push(
      { id: 'nav:labs',     label: 'Open Labs',       group: 'Navigation', keywords: ['labs', 'open'],     run: () => navigate('labs') },
      { id: 'nav:settings', label: 'Open Settings',   group: 'Navigation', keywords: ['settings', 'prefs'], run: () => navigate('settings') },
    )

    // Dynamic: filter labs by name → "Open: <name>"
    for (const l of labs) {
      list.push({
        id:       `lab:${l.id}`,
        label:    `Open: ${l.title}`,
        hint:     `${l.category} · ${l.vendor}`,
        group:    'Labs',
        keywords: [l.title, l.category, l.vendor, 'open'],
        run:      () => { setActiveLab(l); startLabTimer(); navigate('labs') },
      })
    }

    return list
  }, [labs, activeLab, activeStepIndex, labStartTime, setActiveLab, setActiveView, setActiveStepIndex, startLabTimer, clearLabTimer, updateStepResult, onClose])

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

  // Focus / reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  // Keyboard handling
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

  // Group for render
  const grouped = useMemo(() => {
    const g: Record<string, Command[]> = { Action: [], Navigation: [], Labs: [] }
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
              width: 480, maxWidth: 'calc(100vw - 32px)',
              background: 'rgba(15,17,23,0.98)',
              border: `1px solid ${ACCENT}55`,
              borderRadius: 12,
              boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 40px ${ACCENT}18`,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Input */}
            <div style={{
              padding: '12px 14px', borderBottom: `1px solid ${ACCENT}22`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Run a command or open a lab…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e6edf3', fontSize: 14, fontFamily: 'inherit',
                }}
              />
              <span style={{
                fontSize: 9, color: '#6b7280', fontFamily: 'JetBrains Mono, monospace',
                border: `1px solid ${ACCENT}33`, padding: '1px 5px', borderRadius: 4,
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
                (['Action', 'Navigation', 'Labs'] as const).map(group => (
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
                              background: active ? `${ACCENT}14` : 'transparent',
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
              borderTop: `1px solid ${ACCENT}22`,
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
