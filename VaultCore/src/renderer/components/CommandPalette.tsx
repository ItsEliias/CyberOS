// VaultCore — ⌘K Command Palette
// Self-contained palette for navigation + scrape actions. Opens on ⌘K (App.tsx listens).
// Dispatches window CustomEvents for actions whose state lives in DashboardView.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVaultCoreStore, type ActiveViewVC } from '../stores/useVaultCoreStore';

const ACCENT = '#3fb950';

type Group = 'Action' | 'Navigate' | 'Source';

interface Command {
  id:        string;
  label:     string;
  hint?:     string;
  group:     Group;
  keywords?: string[];
  accent:    string;
  run:       () => void | Promise<void>;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let ti = 0, matched = 0;
  for (const c of q) {
    const i = t.indexOf(c, ti);
    if (i === -1) return 0;
    matched++; ti = i + 1;
  }
  return matched;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]      = useState('');
  const [activeIdx, setActive] = useState(0);
  const inputRef               = useRef<HTMLInputElement | null>(null);

  const setActiveView  = useVaultCoreStore(s => s.setActiveView);
  const sources        = useVaultCoreStore(s => s.sources);
  const updateSource   = useVaultCoreStore(s => s.updateSource);

  // ── Build command list ──────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const nav = (view: ActiveViewVC, label: string, hint: string, keywords: string[]): Command => ({
      id: `nav:${view}`, label, hint, group: 'Navigate',
      keywords, accent: ACCENT,
      run: () => { setActiveView(view); onClose(); },
    });

    const base: Command[] = [
      nav('dashboard', 'Open Dashboard', 'Overview',       ['dashboard', 'home', 'overview']),
      nav('sources',   'Open Sources',   'Manage scrapes', ['sources', 'list', 'scrapes']),
      nav('health',    'Open Vault Health', 'Stats',       ['health', 'stats', 'vault', 'duplicates', 'links']),
      nav('settings',  'Open Settings',  'Preferences',    ['settings', 'preferences', 'config']),

      {
        id: 'vc:run-all', label: 'Run all scrapes now', hint: 'Sequential pass',
        group: 'Action', keywords: ['run', 'all', 'scrape', 'now', 'start'],
        accent: ACCENT,
        run: () => {
          setActiveView('dashboard');
          setTimeout(() => window.dispatchEvent(new CustomEvent('vc:run-all')), 0);
          onClose();
        },
      },
      {
        id: 'vc:refresh-stats', label: 'Refresh stats', hint: 'Re-scan vault',
        group: 'Action', keywords: ['refresh', 'stats', 'reload', 'rescan'],
        accent: '#d29922',
        run: () => {
          setActiveView('dashboard');
          setTimeout(() => window.dispatchEvent(new CustomEvent('vc:refresh-stats')), 0);
          onClose();
        },
      },
      {
        id: 'vc:pause-all', label: 'Pause all schedules', hint: 'Disable sources',
        group: 'Action', keywords: ['pause', 'stop', 'disable', 'schedule', 'all'],
        accent: '#d29922',
        run: async () => {
          for (const s of sources) {
            if (s.enabled) updateSource(s.id, { enabled: false });
          }
          onClose();
        },
      },
      {
        id: 'vc:resume-all', label: 'Resume all schedules', hint: 'Re-enable sources',
        group: 'Action', keywords: ['resume', 'start', 'enable', 'schedule', 'all'],
        accent: ACCENT,
        run: async () => {
          for (const s of sources) {
            if (!s.enabled) updateSource(s.id, { enabled: true });
          }
          onClose();
        },
      },
    ];

    // Dynamic: filter sources by name.
    if (query.trim() && sources.length > 0) {
      const scored = sources
        .map(s => ({ s, score: fuzzyScore(query, s.name || '') }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      for (const { s } of scored) {
        base.push({
          id: `run:${s.id}`,
          label: `Run: ${s.name}`,
          hint: s.url || s.type,
          group: 'Source',
          keywords: [s.name, s.type, ...(s.tags || [])].filter(Boolean) as string[],
          accent: ACCENT,
          run: async () => {
            try { await window.electronAPI.scrapeSourceNow(s.id); } catch { /* ignore */ }
            onClose();
          },
        });
      }
    }

    return base;
  }, [sources, query, setActiveView, updateSource, onClose]);

  // Filter + score
  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands
      .map(c => {
        if (c.id.startsWith('run:')) return { c, score: 1000 }; // already query-scoped
        const text = [c.label, c.hint, ...(c.keywords || [])].filter(Boolean).join(' ');
        return { c, score: fuzzyScore(query, text) };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c);
  }, [query, commands]);

  // ── Focus & key handling ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery(''); setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
      else if (e.key === 'Enter')     {
        e.preventDefault();
        const cmd = filtered[activeIdx];
        if (cmd) cmd.run();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIdx, onClose]);

  const grouped = useMemo(() => {
    const g: Record<Group, Command[]> = { Action: [], Navigate: [], Source: [] };
    for (const c of filtered) g[c.group].push(c);
    return g;
  }, [filtered]);

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
                placeholder="Search actions or sources…"
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
                (['Action', 'Source', 'Navigate'] as const).map(group => (
                  grouped[group].length > 0 && (
                    <div key={group} style={{ marginBottom: 4 }}>
                      <div style={{
                        padding: '6px 12px 4px',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#4a5568',
                      }}>{group}</div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c);
                        const active  = flatIdx === activeIdx;
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
                        );
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
  );
}
