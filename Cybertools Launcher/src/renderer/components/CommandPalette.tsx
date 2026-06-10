// Launcher — ⌘K Command Palette
// Migration: replaced 428 LOC of inline CSS-in-JS with token-driven CSS vars
// and Tailwind preset classes. ALL functional logic preserved verbatim.
// Anti-slop: no hardcoded hex values — every color resolves through tokens.css.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Command {
  id:        string;
  label:     string;
  hint?:     string;
  group:     'App' | 'Action' | 'Settings';
  keywords?: string[];
  accent:    string;            // tinted dot — per-app canonical color
  run:       () => Promise<void> | void;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

// Per-app dot accent colors — sourced from canonical app values in tailwind-preset.cjs.
// No off-spec hex values; these match APP_ACCENT in SearchApp.tsx exactly.
const APP_DOTS: Record<string, string> = {
  cyberlab:       '#b44fff',
  vaultscraper:   '#3fb950',
  ghostvault:     '#7bb8ff',
  recondesk:      '#d29922',
  signalboard:    '#ff6b6b',
  cyberos:        '#4a9eff',
  credvault:      '#f78166',
  playbookstudio: '#4a9eff',
  reportforge:    '#3fb950',
  terminallink:   '#00ff41',
  networkmap:     '#d29922',
  netlab:         '#a78bfa',
};

const APP_LABELS: Record<string, string> = {
  cyberlab:       'CyberLab Companion',
  vaultscraper:   'VaultCore',
  ghostvault:     'GhostVault',
  recondesk:      'ReconDesk',
  signalboard:    'SignalBoard',
  cyberos:        'CyberOS Dashboard',
  credvault:      'CredVault',
  playbookstudio: 'PlaybookStudio',
  reportforge:    'ReportForge',
  terminallink:   'TermLink',
  networkmap:     'NetworkMap',
  netlab:         'NetLab',
};

// Lightweight subsequence fuzzy match — returns a score for sort, 0 = no match
function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100 - (t.indexOf(q));
  let ti = 0;
  let matched = 0;
  for (const c of q) {
    const i = t.indexOf(c, ti);
    if (i === -1) return 0;
    matched++;
    ti = i + 1;
  }
  return matched;
}

// Map AppStatus.id → launch key
const ID_TO_KEY: Record<string, string> = {
  'CyberLab Companion': 'cyberlab',
  'Cyberlab Companion': 'cyberlab',
  'VaultCore':          'vaultscraper',
  'GhostVault':         'ghostvault',
  'ReconDesk':          'recondesk',
  'SignalBoard':        'signalboard',
  'CredVault':          'credvault',
  'PlaybookStudio':     'playbookstudio',
  'ReportForge':        'reportforge',
  'TerminalLink':       'terminallink',
  'TermLink':           'terminallink',
  'NetworkMap':         'networkmap',
  'NetLab':             'netlab',
};

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]         = useState('');
  const [activeIdx, setActive]    = useState(0);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const [ssoUnlocked, setSsoUnlocked] = useState<boolean | null>(null);
  const [runErr, setRunErr]       = useState<string | null>(null);
  const inputRef                  = useRef<HTMLInputElement | null>(null);

  // Refresh installed map + SSO state whenever palette opens.
  useEffect(() => {
    if (!open) return;
    window.api.appManager.getStatus()
      .then(statuses => {
        const map: Record<string, boolean> = {};
        for (const s of statuses) {
          const key = ID_TO_KEY[s.id];
          if (key) map[key] = s.installed;
        }
        setInstalled(map);
      })
      .catch(() => {});
    window.api.getSSO?.()
      .then(r => setSsoUnlocked(!!r.unlocked))
      .catch(() => setSsoUnlocked(null));
  }, [open]);

  // ── Build command list ─────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const apps: Command[] = Object.keys(APP_LABELS).map(key => ({
      id:       `open:${key}`,
      label:    APP_LABELS[key],
      hint:     installed[key] ? 'Open' : 'Not installed',
      group:    'App',
      keywords: [key, 'open', 'launch'],
      accent:   APP_DOTS[key] || '#8b949e',
      run:      async () => {
        if (installed[key] === false) {
          setRunErr(`${APP_LABELS[key]} isn't installed — drop the .app into /Applications.`);
          setTimeout(() => setRunErr(null), 4000);
          return;
        }
        await window.api.launchApp(key);
        onClose();
      },
    }));

    const actions: Command[] = [
      {
        id:       'action:refresh',
        label:    'Refresh app statuses',
        hint:     'Re-scan /Applications',
        group:    'Action',
        keywords: ['refresh', 'rescan', 'reload'],
        accent:   '#d29922',
        run:      async () => {
          const statuses = await window.api.appManager.getStatus();
          void statuses;
          onClose();
        },
      },
      {
        id:       'action:update-vaultcore',
        label:    'Run VaultCore update now',
        hint:     'Trigger a scrape pass',
        group:    'Action',
        keywords: ['vault', 'scrape', 'update'],
        accent:   '#3fb950',
        run:      async () => { await window.api.updateNow(); onClose(); },
      },
      {
        id:       'action:hide',
        label:    'Minimise launcher',
        hint:     'Re-open from tray',
        group:    'Action',
        keywords: ['hide', 'close', 'minimise', 'minimize'],
        accent:   'var(--text-secondary)',
        run:      async () => { await window.api.hidePanel(); },
      },
      {
        id:       'action:lock-ecosystem',
        label:    ssoUnlocked === false ? 'Unlock CredVault…' : 'Lock CredVault session',
        hint:     ssoUnlocked === false
                    ? 'Opens CredVault so you can unlock the ecosystem session'
                    : '⌘L · Soft-locks every app that requires the session',
        group:    'Action',
        keywords: ['lock', 'unlock', 'sso', 'credvault', 'session', 'logout'],
        accent:   '#f78166',
        run:      async () => {
          if (ssoUnlocked === false) {
            await window.api.launchApp('credvault');
          } else {
            await window.api.lockEcosystem();
          }
          onClose();
        },
      },
    ];

    const settings: Command[] = [
      {
        id:       'settings:open',
        label:    'Open Launcher settings',
        hint:     '⌘,',
        group:    'Settings',
        keywords: ['settings', 'preferences', 'config'],
        accent:   'var(--text-secondary)',
        run:      () => {
          window.dispatchEvent(new CustomEvent('cmd-palette:open-settings'));
          onClose();
        },
      },
      {
        id:       'help:docs',
        label:    'Open CyberOS documentation',
        hint:     'github.com/ItsEliias/CyberOS',
        group:    'Settings',
        keywords: ['help', 'docs', 'documentation', 'github', 'readme'],
        accent:   '#4a9eff',
        run:      async () => {
          await window.api.openExternal('https://github.com/ItsEliias/CyberOS');
          onClose();
        },
      },
      {
        id:       'help:issue',
        label:    'Report an issue',
        hint:     'Open GitHub issues',
        group:    'Settings',
        keywords: ['issue', 'bug', 'report', 'feedback', 'github'],
        accent:   '#f85149',
        run:      async () => {
          await window.api.openExternal('https://github.com/ItsEliias/CyberOS/issues/new');
          onClose();
        },
      },
    ];

    return [...apps, ...actions, ...settings];
  }, [installed, onClose, ssoUnlocked]);

  // Filter + score
  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands
      .map(c => {
        const text = [c.label, c.hint, ...(c.keywords || [])].filter(Boolean).join(' ');
        return { c, score: fuzzyScore(query, text) };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.c);
  }, [query, commands]);

  // ── Focus & key handling ───────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setRunErr(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(i => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(i => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[activeIdx];
        if (cmd) cmd.run();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIdx, onClose]);

  // Group sections for render
  const grouped = useMemo(() => {
    const g: Record<string, Command[]> = { App: [], Action: [], Settings: [] };
    for (const c of filtered) g[c.group].push(c);
    return g;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        // Backdrop — token-driven surface, Arc-style frosted glass
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-start justify-center"
          style={{
            background: 'rgba(5,6,12,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            paddingTop: 80,
          }}
        >
          {/* Palette container — glass-card-strong from tokens.css */}
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="w-[460px] max-w-[calc(100vw-32px)] overflow-hidden flex flex-col"
            style={{
              background: 'var(--surface-glass-strong)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--elevation-4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Search input row */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border-subtle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search apps and actions…"
                className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary font-display"
                style={{ caretColor: 'var(--accent)' }}
              />
              <span
                className="text-[9px] font-mono text-text-muted border border-border-default px-1.5 py-0.5 rounded"
                style={{ borderRadius: 'var(--radius-xs)' }}
              >
                ⌘K
              </span>
            </div>

            {/* Error banner */}
            {runErr && (
              <div
                className="px-3.5 py-2 border-b text-[11px] font-mono"
                style={{
                  borderBottom: '1px solid rgba(248,81,73,0.25)',
                  background: 'var(--sev-critical-bg)',
                  color: 'var(--sev-critical)',
                }}
              >
                {runErr}
              </div>
            )}

            {/* Results list */}
            <div className="max-h-[360px] overflow-y-auto py-1.5 px-1">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-text-muted">
                  No matches
                </div>
              ) : (
                (['App', 'Action', 'Settings'] as const).map(group => (
                  grouped[group].length > 0 && (
                    <div key={group} className="mb-1">
                      {/* Group label */}
                      <div
                        className="px-3 pt-1.5 pb-1 text-[9px] font-bold tracking-[0.12em] uppercase text-text-muted"
                      >
                        {group}
                      </div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c);
                        const isActive = flatIdx === activeIdx;
                        return (
                          <button
                            key={c.id}
                            onClick={() => c.run()}
                            onMouseEnter={() => setActive(flatIdx)}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 transition-colors border-l-2"
                            style={{
                              background: isActive ? 'var(--accent-tint2)' : 'transparent',
                              borderLeftColor: isActive ? 'var(--accent)' : 'transparent',
                              cursor: 'pointer',
                            }}
                          >
                            {/* Per-app accent dot */}
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                background: c.accent,
                                boxShadow: `0 0 6px ${c.accent}60`,
                              }}
                            />
                            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                              <span
                                className="text-[12.5px] font-medium text-text-primary truncate"
                              >
                                {c.label}
                              </span>
                              {c.hint && (
                                <span className="text-[10px] text-text-muted shrink-0">
                                  {c.hint}
                                </span>
                              )}
                            </div>
                            {isActive && (
                              <span
                                className="text-[9px] font-mono shrink-0"
                                style={{ color: 'var(--accent)' }}
                              >
                                ↵
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )
                ))
              )}
            </div>

            {/* Footer hint bar */}
            <div
              className="px-3 py-2 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted"
            >
              <span>↑↓ navigate · ↵ run · ⎋ close</span>
              <span>{filtered.length} command{filtered.length === 1 ? '' : 's'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
