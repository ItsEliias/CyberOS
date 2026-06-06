// GhostVault — ⌘K Command Palette
// Self-contained palette for notes, search, theme + personality switching.
// App.tsx listens for ⌘K and toggles this open.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { CoreTheme, PersonalityTheme, ThemeConfig } from '@shared/types';

const ACCENT = '#7bb8ff';

type Group = 'Action' | 'Navigate' | 'Theme' | 'Personality' | 'Note';

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

const CORE_THEMES:        CoreTheme[]        = ['stealth', 'graphite', 'frost', 'oled'];
const PERSONALITY_THEMES: PersonalityTheme[] = ['neutral', 'cyberpunk', 'terminal', 'threat'];

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]      = useState('');
  const [activeIdx, setActive] = useState(0);
  const inputRef               = useRef<HTMLInputElement | null>(null);

  const setActiveView = useStore(s => s.setActiveView);
  const notes         = useStore(s => s.notes);
  const config        = useStore(s => s.config);
  const setConfig     = useStore(s => s.setConfig);

  function applyTheme(next: ThemeConfig) {
    document.documentElement.setAttribute('data-core', next.core);
    document.documentElement.setAttribute('data-personality', next.personality);
    void window.ghostvault.saveConfig({ theme: next });
    if (config) setConfig({ ...config, theme: next });
  }

  // ── Build command list ──────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const currentTheme: ThemeConfig = (() => {
      const t = config?.theme;
      if (t && typeof t === 'object' && 'core' in t && 'personality' in t) {
        return t as ThemeConfig;
      }
      return { core: 'stealth', personality: 'neutral' };
    })();

    const base: Command[] = [
      {
        id: 'gv:new-note', label: 'New note', hint: '⌘N',
        group: 'Action', keywords: ['new', 'note', 'create'],
        accent: ACCENT,
        run: () => {
          window.dispatchEvent(new CustomEvent('gv:new-note'));
          onClose();
        },
      },
      {
        id: 'gv:quick-capture', label: 'Quick capture', hint: '⌘P',
        group: 'Action', keywords: ['capture', 'quick', 'paste', 'snip'],
        accent: ACCENT,
        run: async () => {
          try { await window.ghostvault.toggleCapture(); } catch { /* ignore */ }
          onClose();
        },
      },
      {
        id: 'gv:search', label: 'Search vault', hint: '⌘F',
        group: 'Action', keywords: ['search', 'find', 'query'],
        accent: ACCENT,
        run: () => { setActiveView('fullsearch'); onClose(); },
      },

      // Navigate
      {
        id: 'nav:notes', label: 'Open Notes',
        group: 'Navigate', keywords: ['notes', 'editor'],
        accent: '#3fb950',
        run: () => { setActiveView('notes'); onClose(); },
      },
      {
        id: 'nav:vault', label: 'Open Vault browser',
        group: 'Navigate', keywords: ['vault', 'browse', 'folders'],
        accent: '#3fb950',
        run: () => { setActiveView('vault'); onClose(); },
      },
      {
        id: 'nav:tags', label: 'Open Tags',
        group: 'Navigate', keywords: ['tags'],
        accent: '#3fb950',
        run: () => { setActiveView('tags'); onClose(); },
      },
      {
        id: 'nav:graph', label: 'Open Graph',
        group: 'Navigate', keywords: ['graph', 'links', 'network'],
        accent: '#3fb950',
        run: () => { setActiveView('graph'); onClose(); },
      },
      {
        id: 'nav:templates', label: 'Open Templates',
        group: 'Navigate', keywords: ['templates'],
        accent: '#3fb950',
        run: () => { setActiveView('templates'); onClose(); },
      },
      {
        id: 'nav:settings', label: 'Open Settings',
        group: 'Navigate', keywords: ['settings', 'preferences'],
        accent: '#3fb950',
        run: () => { setActiveView('settings'); onClose(); },
      },
    ];

    // Theme switching (core)
    for (const core of CORE_THEMES) {
      base.push({
        id: `theme:${core}`,
        label: `Switch theme: ${core}`,
        hint: core === currentTheme.core ? 'current' : undefined,
        group: 'Theme',
        keywords: ['theme', 'switch', core],
        accent: '#a78bfa',
        run: () => {
          applyTheme({ core, personality: currentTheme.personality });
          onClose();
        },
      });
    }

    // Personality switching
    for (const p of PERSONALITY_THEMES) {
      base.push({
        id: `personality:${p}`,
        label: `Switch personality: ${p}`,
        hint: p === currentTheme.personality ? 'current' : undefined,
        group: 'Personality',
        keywords: ['personality', 'mood', p],
        accent: '#e879f9',
        run: () => {
          applyTheme({ core: currentTheme.core, personality: p });
          onClose();
        },
      });
    }

    // Dynamic: filter notes by title.
    if (query.trim() && notes.length > 0) {
      const scored = notes
        .map(n => ({ n, s: fuzzyScore(query, n.name || '') }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5);
      for (const { n } of scored) {
        base.push({
          id: `open:${n.path}`,
          label: `Open: ${n.name}`,
          hint: n.rel,
          group: 'Note',
          keywords: [n.name, n.filename, n.rel].filter(Boolean) as string[],
          accent: ACCENT,
          run: () => {
            window.dispatchEvent(new CustomEvent<string>('gv:open-note', { detail: n.path }));
            onClose();
          },
        });
      }
    }

    return base;
    // setConfig is stable from zustand; config drives theme display.
  }, [config, notes, query, setActiveView, onClose]);

  // Filter + score
  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands
      .map(c => {
        if (c.id.startsWith('open:')) return { c, score: 1000 };
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
    const g: Record<Group, Command[]> = {
      Action: [], Note: [], Navigate: [], Theme: [], Personality: [],
    };
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
                placeholder="Search actions or notes…"
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

            <div style={{ maxHeight: 400, overflowY: 'auto', padding: '6px 4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>
                  No matches
                </div>
              ) : (
                (['Action', 'Note', 'Navigate', 'Theme', 'Personality'] as const).map(group => (
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
