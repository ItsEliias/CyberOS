// CredVault — ⌘K Command Palette
// Self-contained palette for credential actions. Opens on ⌘K (App.tsx listens).
// Dispatches window CustomEvents for VaultView-owned modal state (Add, Generator, HIBP).

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'

const ACCENT = '#f78166'

type Group = 'Action' | 'Navigate' | 'Credential' | 'Vault'

interface Command {
  id:        string
  label:     string
  hint?:     string
  group:     Group
  keywords?: string[]
  accent:    string
  run:       () => void | Promise<void>
}

interface Props {
  open:    boolean
  onClose: () => void
}

// Subsequence fuzzy match — returns a score, 0 = no match.
function fuzzyScore(query: string, target: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return 100 - t.indexOf(q)
  let ti = 0, matched = 0
  for (const c of q) {
    const i = t.indexOf(c, ti)
    if (i === -1) return 0
    matched++; ti = i + 1
  }
  return matched
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]      = useState('')
  const [activeIdx, setActive] = useState(0)
  const inputRef               = useRef<HTMLInputElement | null>(null)

  const credentials   = useStore(s => s.credentials)
  const setView       = useStore(s => s.setView)
  const setSearch     = useStore(s => s.setSearch)

  // Most recently used credential (for copy-username / copy-password actions)
  const lastUsedCred = useMemo(() => {
    const withLU = credentials.filter(c => c.lastUsed)
    if (withLU.length === 0) return null
    return [...withLU].sort(
      (a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime(),
    )[0]
  }, [credentials])

  // ── Build command list ──────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      {
        id: 'cv:add', label: 'Add credential', hint: 'Create new',
        group: 'Action', keywords: ['add', 'new', 'create', 'credential'],
        accent: ACCENT,
        run: () => {
          setView('vault')
          // Defer so VaultView is mounted before the event fires.
          setTimeout(() => window.dispatchEvent(new CustomEvent('cv:add')), 0)
          onClose()
        },
      },
      {
        id: 'cv:generate', label: 'Generate password', hint: 'Open generator',
        group: 'Action', keywords: ['generate', 'password', 'random'],
        accent: ACCENT,
        run: () => {
          setView('vault')
          setTimeout(() => window.dispatchEvent(new CustomEvent('cv:generate')), 0)
          onClose()
        },
      },
      {
        id: 'cv:hibp', label: 'Run HIBP check', hint: 'Scan for breaches',
        group: 'Action', keywords: ['hibp', 'breach', 'pwned', 'check', 'scan'],
        accent: '#f85149',
        run: () => {
          setView('vault')
          setTimeout(() => window.dispatchEvent(new CustomEvent('cv:hibp')), 0)
          onClose()
        },
      },
      {
        id: 'cv:lock', label: 'Lock vault', hint: 'Require password',
        group: 'Vault', keywords: ['lock', 'logout', 'sign out', 'secure'],
        accent: '#d29922',
        run: async () => { await window.electronAPI.lockVault(); onClose() },
      },
      {
        id: 'nav:vault', label: 'Open Vault', hint: 'View credentials',
        group: 'Navigate', keywords: ['vault', 'list', 'credentials'],
        accent: '#3fb950',
        run: () => { setView('vault'); onClose() },
      },
      {
        id: 'nav:import', label: 'Open Import', hint: 'Bring data in',
        group: 'Navigate', keywords: ['import', 'csv', 'upload', 'restore'],
        accent: '#3fb950',
        run: () => { setView('import'); onClose() },
      },
      {
        id: 'nav:settings', label: 'Open Settings', hint: 'Preferences',
        group: 'Navigate', keywords: ['settings', 'preferences', 'config'],
        accent: '#3fb950',
        run: () => { setView('settings'); onClose() },
      },
    ]

    // Last-used credential copy actions (only if we have one).
    if (lastUsedCred) {
      if (lastUsedCred.username) {
        base.push({
          id: 'cv:copy-user',
          label: `Copy username — ${lastUsedCred.service}`,
          hint: 'Last used',
          group: 'Credential',
          keywords: ['copy', 'username', 'user', lastUsedCred.service],
          accent: '#4a9eff',
          run: async () => {
            await window.electronAPI.copySecure(lastUsedCred.username, 30_000)
            onClose()
          },
        })
      }
      if (lastUsedCred.password) {
        base.push({
          id: 'cv:copy-pw',
          label: `Copy password — ${lastUsedCred.service}`,
          hint: 'Last used',
          group: 'Credential',
          keywords: ['copy', 'password', 'secret', lastUsedCred.service],
          accent: '#a78bfa',
          run: async () => {
            await window.electronAPI.copySecure(lastUsedCred.password!, 30_000)
            onClose()
          },
        })
      }
    }

    // Dynamic: top 5 credential matches by service name.
    if (query.trim()) {
      const scored = credentials
        .map(c => ({ c, s: fuzzyScore(query, c.service || '') }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
      for (const { c } of scored) {
        base.push({
          id: `open:${c.id}`,
          label: `Open: ${c.service}`,
          hint: c.username || c.category,
          group: 'Credential',
          keywords: [c.service, c.username, c.source, ...(c.tags || [])].filter(Boolean) as string[],
          accent: ACCENT,
          run: () => {
            setView('vault')
            setSearch(c.service)
            onClose()
          },
        })
      }
    }

    return base
  }, [credentials, lastUsedCred, query, setView, setSearch, onClose])

  // Filter + score (skip the dynamic Open: entries — they're already scoped by query)
  const filtered = useMemo(() => {
    if (!query) return commands
    return commands
      .map(c => {
        if (c.id.startsWith('open:')) return { c, score: 1000 } // always show
        const text = [c.label, c.hint, ...(c.keywords || [])].filter(Boolean).join(' ')
        return { c, score: fuzzyScore(query, text) }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c)
  }, [query, commands])

  // ── Focus & key handling ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery(''); setActive(0)
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
      else if (e.key === 'Enter')     {
        e.preventDefault()
        const cmd = filtered[activeIdx]
        if (cmd) cmd.run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, activeIdx, onClose])

  // Group sections for render
  const grouped = useMemo(() => {
    const g: Record<Group, Command[]> = { Action: [], Navigate: [], Credential: [], Vault: [] }
    for (const c of filtered) g[c.group].push(c)
    return g
  }, [filtered])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,6,12,0.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 80,
          }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              width: 480, maxWidth: 'calc(100vw - 32px)',
              background: 'rgba(13,14,24,0.98)',
              border: `1px solid ${ACCENT}33`,
              borderRadius: 12,
              boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${ACCENT}1a`,
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Search input */}
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
                placeholder="Search actions or credentials…"
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

            {/* Results list */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>
                  No matches
                </div>
              ) : (
                (['Action', 'Credential', 'Navigate', 'Vault'] as const).map(group => (
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
                              background: active ? `${ACCENT}14` : 'transparent',
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
                              {c.hint && (
                                <span style={{ fontSize: 10, color: '#6b7280' }}>{c.hint}</span>
                              )}
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

            {/* Footer */}
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
