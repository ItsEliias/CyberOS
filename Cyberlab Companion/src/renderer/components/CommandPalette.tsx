// Cyberlab Companion — ⌘K Command Palette
// Self-contained palette to navigate panels, manage sessions, refresh platform
// stats, and jump straight to any lab by name.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { load as loadLabs, getAll as getAllLabs, moveToColumn, serialize } from '../lib/labtracker';
import type { PanelId } from '@shared/types';

const ACCENT = '#b44fff';

interface Command {
  id:        string;
  label:     string;
  hint?:     string;
  group:     'Navigation' | 'Action' | 'Connect' | 'Session' | 'Labs';
  keywords?: string[];
  accent:    string;
  run:       () => Promise<void> | void;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

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

const PANEL_LABELS: Array<{ id: PanelId; label: string; icon: string; keywords: string[] }> = [
  { id: 'progress',     label: 'Progress',      icon: '🏆', keywords: ['stats', 'htb', 'thm', 'rank'] },
  { id: 'labtracker',   label: 'Labs',          icon: '📊', keywords: ['labs', 'tracker', 'kanban'] },
  { id: 'cheatsheets',  label: 'Cheatsheets',   icon: '📋', keywords: ['cheatsheets', 'reference'] },
  { id: 'settings',     label: 'Settings',      icon: '⚙️', keywords: ['settings', 'preferences', 'config'] },
  { id: 'chat',         label: 'Chat',          icon: '💬', keywords: ['chat', 'assistant', 'claude'] },
  { id: 'commands',     label: 'Commands',      icon: '⚡', keywords: ['commands', 'nmap', 'ffuf'] },
  { id: 'reverseshell', label: 'Reverse Shell', icon: '🐚', keywords: ['shell', 'revshell'] },
  { id: 'encoder',      label: 'Encoder',       icon: '🔐', keywords: ['encode', 'decode', 'base64'] },
  { id: 'snippets',     label: 'Snippets',      icon: '📎', keywords: ['snippets', 'payloads'] },
  { id: 'findings',     label: 'Findings',      icon: '🔍', keywords: ['findings', 'recon'] },
  { id: 'history',      label: 'Lab History',   icon: '📅', keywords: ['history', 'past'] },
  { id: 'writeup',      label: 'Writeup',       icon: '📝', keywords: ['writeup', 'notes'] },
  { id: 'knowledgebase',label: 'Knowledge Base',icon: '📚', keywords: ['kb', 'knowledge'] },
  { id: 'stats',        label: 'Stats',         icon: '📈', keywords: ['stats', 'analytics'] },
];

// Scroll a settings sub-section into view after switching to the settings panel.
function scrollToAnchor(anchorId: string) {
  // Allow the settings panel to mount before scrolling.
  setTimeout(() => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]      = useState('');
  const [activeIdx, setActive] = useState(0);
  const inputRef               = useRef<HTMLInputElement | null>(null);

  const {
    tabs, activeTabId, labsData,
    addTab, setActivePanel, setLabsData,
  } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId) || null;
  const activeSession = activeTab?.session || null;
  const hasActiveSession = !!(activeSession?.labName && activeSession.labName !== 'New Session');

  // ── Build command list ─────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    const switchPanel = (id: PanelId) => {
      if (activeTabId) setActivePanel(activeTabId, id);
    };

    // Navigation — every panel
    for (const p of PANEL_LABELS) {
      list.push({
        id: `nav:${p.id}`,
        label: `Open ${p.label}`,
        hint: activeTab?.activePanel === p.id ? 'Current' : undefined,
        group: 'Navigation',
        keywords: [p.label, ...p.keywords],
        accent: ACCENT,
        run: () => { switchPanel(p.id); onClose(); },
      });
    }

    // Actions
    list.push({
      id: 'action:refresh-platform-stats',
      label: 'Refresh platform stats',
      hint: 'HTB + THM',
      group: 'Action',
      keywords: ['refresh', 'sync', 'platform', 'htb', 'thm', 'stats'],
      accent: '#3fb950',
      run: async () => {
        const api = window.electronAPI as Record<string, Function>;
        try { await api.fetchHtbStats?.(); } catch { /* ignore */ }
        try { await api.fetchThmStats?.(); } catch { /* ignore */ }
        // Show the Progress panel so the user sees freshly refreshed data
        switchPanel('progress');
        onClose();
      },
    });

    // Connect cards in Settings → ApiConnections
    list.push({
      id: 'connect:htb',
      label: 'Connect HackTheBox',
      hint: 'Settings → API Connections',
      group: 'Connect',
      keywords: ['htb', 'hackthebox', 'connect', 'api', 'token'],
      accent: '#9fef00',
      run: () => {
        switchPanel('settings');
        scrollToAnchor('api-connections-htb');
        onClose();
      },
    });
    list.push({
      id: 'connect:thm',
      label: 'Connect TryHackMe',
      hint: 'Settings → API Connections',
      group: 'Connect',
      keywords: ['thm', 'tryhackme', 'connect', 'api', 'cookie'],
      accent: '#88cc14',
      run: () => {
        switchPanel('settings');
        scrollToAnchor('api-connections-thm');
        onClose();
      },
    });

    // Sessions
    list.push({
      id: 'session:new',
      label: 'Start new session',
      hint: 'Opens a new tab',
      group: 'Session',
      keywords: ['session', 'new', 'tab', 'start'],
      accent: ACCENT,
      run: () => { addTab(); onClose(); },
    });

    if (hasActiveSession && activeSession) {
      list.push({
        id: 'session:mark-complete',
        label: `Mark current lab complete: ${activeSession.labName}`,
        hint: 'Move lab to completed',
        group: 'Session',
        keywords: ['complete', 'done', 'finish', activeSession.labName],
        accent: '#3fb950',
        run: async () => {
          // Reload labs into the in-memory store, find a match by name + platform,
          // then move it to completed.
          loadLabs(labsData);
          const all = getAllLabs();
          const target = all.find(l =>
            l.name.toLowerCase() === activeSession.labName.toLowerCase() &&
            (!activeSession.platform || l.platform.toLowerCase() === String(activeSession.platform).toLowerCase())
          );
          if (target) {
            moveToColumn(target.id, 'completed');
            const next = serialize();
            setLabsData(next);
            try { await window.electronAPI.saveLabTracker(next); } catch { /* ignore */ }
            try {
              const api = window.electronAPI as Record<string, Function>;
              await api.completeLab?.({ platform: target.platform, labType: target.platform });
            } catch { /* ignore */ }
          }
          onClose();
        },
      });
    }

    // Labs — open by name (switches to lab tracker; no per-lab navigation in app, so we just show the panel)
    const labs = (Array.isArray(labsData) ? labsData : []).slice(0, 60);
    for (const lab of labs) {
      const name = (lab as { name?: string }).name;
      if (!name) continue;
      const platform = (lab as { platform?: string }).platform || '';
      const column   = (lab as { column?: string }).column || '';
      list.push({
        id: `lab:${(lab as { id: string }).id}`,
        label: `Open: ${name}`,
        hint: [platform, column].filter(Boolean).join(' · '),
        group: 'Labs',
        keywords: [name, platform],
        accent: '#7bb8ff',
        run: () => {
          switchPanel('labtracker');
          onClose();
        },
      });
    }

    return list;
  }, [tabs, activeTab, activeTabId, activeSession, hasActiveSession, labsData, addTab, setActivePanel, setLabsData, onClose]);

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
    const g: Record<string, Command[]> = { Navigation: [], Action: [], Connect: [], Session: [], Labs: [] };
    for (const c of filtered) g[c.group].push(c);
    return g;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
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
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="flex flex-col overflow-hidden"
            style={{
              width: 480, maxWidth: 'calc(100vw - 32px)',
              background: 'var(--panel, rgba(13,14,24,0.98))',
              border: '1px solid var(--border, rgba(42,51,71,0.6))',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-2.5"
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border, rgba(42,51,71,0.5))',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search panels, labs, actions…"
                className="flex-1 bg-transparent outline-none border-none text-sm"
                style={{ color: 'var(--text, #e6edf3)', fontFamily: 'inherit' }}
              />
              <span
                className="text-[9px] font-mono px-1.5 py-px rounded"
                style={{
                  color: 'var(--text-muted, #4a5568)',
                  border: '1px solid var(--border, rgba(42,51,71,0.6))',
                }}
              >
                ⌘K
              </span>
            </div>

            {/* Results list */}
            <div className="overflow-y-auto" style={{ maxHeight: 400, padding: '6px 4px' }}>
              {filtered.length === 0 ? (
                <div className="text-center text-xs" style={{ padding: 24, color: 'var(--text-muted, #4a5568)' }}>
                  No matches
                </div>
              ) : (
                (['Navigation', 'Action', 'Connect', 'Session', 'Labs'] as const).map(group => (
                  grouped[group].length > 0 && (
                    <div key={group} style={{ marginBottom: 4 }}>
                      <div
                        className="uppercase font-bold tracking-widest"
                        style={{
                          padding: '6px 12px 4px',
                          fontSize: 9,
                          letterSpacing: '0.12em',
                          color: 'var(--text-muted, #4a5568)',
                        }}
                      >
                        {group}
                      </div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c);
                        const active = flatIdx === activeIdx;
                        return (
                          <button
                            key={c.id}
                            onClick={() => c.run()}
                            onMouseEnter={() => setActive(flatIdx)}
                            className="w-full text-left flex items-center gap-2.5"
                            style={{
                              padding: '7px 12px',
                              background: active ? 'rgba(180,79,255,0.12)' : 'transparent',
                              border: 'none', cursor: 'pointer',
                              borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                            }}
                          >
                            <span
                              className="rounded-full flex-shrink-0"
                              style={{
                                width: 7, height: 7,
                                background: c.accent,
                                boxShadow: `0 0 6px ${c.accent}60`,
                              }}
                            />
                            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                              <span
                                className="truncate font-medium"
                                style={{ fontSize: 12.5, color: 'var(--text, #e6edf3)' }}
                              >
                                {c.label}
                              </span>
                              {c.hint && (
                                <span
                                  className="truncate"
                                  style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}
                                >
                                  {c.hint}
                                </span>
                              )}
                            </div>
                            {active && (
                              <span className="font-mono" style={{ fontSize: 9, color: ACCENT }}>↵</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between font-mono"
              style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--border, rgba(42,51,71,0.5))',
                fontSize: 10,
                color: 'var(--text-muted, #4a5568)',
              }}
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
