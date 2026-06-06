// ReportForge — ⌘K Command Palette
// Self-contained palette for navigating views, exporting, editing the active
// report and jumping straight to any report by title.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { makeBlankFinding, makeId } from '../lib/defaults';
import type { Report, ReportSection } from '@shared/types';

const ACCENT = '#3fb950';

interface Command {
  id:        string;
  label:     string;
  hint?:     string;
  group:     'Navigation' | 'Report' | 'Editor' | 'Library';
  keywords?: string[];
  accent:    string;
  run:       () => Promise<void> | void;
}

interface Props {
  open:           boolean;
  onClose:        () => void;
  onExportFormat: (format: 'markdown' | 'pdf') => void;
  onOpenCveLookup?: () => void;
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

export default function CommandPalette({ open, onClose, onExportFormat, onOpenCveLookup }: Props) {
  const [query, setQuery]      = useState('');
  const [activeIdx, setActive] = useState(0);
  const inputRef               = useRef<HTMLInputElement | null>(null);

  const {
    view, activeReport, reports,
    setView, setActiveReport, patchReportMeta, setActiveSectionId, upsertFinding,
  } = useStore();

  // ── Build command list ─────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    // Navigation
    list.push({
      id: 'nav:library',
      label: 'Open Library',
      hint: view === 'library' ? 'Current' : undefined,
      group: 'Navigation',
      keywords: ['library', 'reports', 'home'],
      accent: ACCENT,
      run: () => { setView('library'); onClose(); },
    });
    if (activeReport) {
      list.push({
        id: 'nav:editor',
        label: 'Open Editor',
        hint: view === 'editor' ? 'Current' : activeReport.title,
        group: 'Navigation',
        keywords: ['editor', 'edit', 'report'],
        accent: ACCENT,
        run: () => { setView('editor'); onClose(); },
      });
    }

    // Report-level
    list.push({
      id: 'report:new',
      label: 'New report',
      hint: 'Start the new-report wizard',
      group: 'Report',
      keywords: ['new', 'create', 'wizard', 'report'],
      accent: ACCENT,
      run: () => { setView('wizard'); onClose(); },
    });

    if (activeReport) {
      list.push({
        id: 'report:export-md',
        label: 'Export current report (Markdown)',
        hint: activeReport.title,
        group: 'Report',
        keywords: ['export', 'markdown', 'md'],
        accent: ACCENT,
        run: () => { onExportFormat('markdown'); onClose(); },
      });
      list.push({
        id: 'report:export-pdf',
        label: 'Export current report (PDF)',
        hint: activeReport.title,
        group: 'Report',
        keywords: ['export', 'pdf'],
        accent: '#ff8c42',
        run: () => { onExportFormat('pdf'); onClose(); },
      });
    }

    // Editor-only commands (gated by view === 'editor' && activeReport)
    if (view === 'editor' && activeReport) {
      list.push({
        id: 'editor:add-section',
        label: 'Add new section',
        hint: 'Body section',
        group: 'Editor',
        keywords: ['section', 'add', 'new'],
        accent: ACCENT,
        run: () => {
          const newSection: ReportSection = {
            id      : makeId(),
            title   : 'New Section',
            content : '',
            order   : activeReport.sections.length,
            visible : true,
            type    : 'body',
            comments: [],
          };
          patchReportMeta({ sections: [...activeReport.sections, newSection] } as never);
          setActiveSectionId(newSection.id);
          onClose();
        },
      });
      list.push({
        id: 'editor:add-finding',
        label: 'Add finding',
        hint: 'New blank finding',
        group: 'Editor',
        keywords: ['finding', 'vuln', 'add', 'new'],
        accent: '#f85149',
        run: () => {
          upsertFinding(makeBlankFinding());
          onClose();
        },
      });
      if (onOpenCveLookup) {
        list.push({
          id: 'editor:cve',
          label: 'Insert finding from CVE…',
          hint: 'NVD lookup',
          group: 'Editor',
          keywords: ['cve', 'lookup', 'nvd', 'vuln'],
          accent: '#d29922',
          run: () => { onOpenCveLookup(); onClose(); },
        });
      }
    }

    // Library — open by title
    const matchingReports = reports.slice(0, 50);
    for (const r of matchingReports) {
      list.push({
        id: `library:${r.id}`,
        label: `Open: ${r.title}`,
        hint: r.targetName || r.targetIP || r.platform,
        group: 'Library',
        keywords: [r.title, r.targetName || '', r.platform || ''].filter(Boolean),
        accent: '#7bb8ff',
        run: () => {
          openReport(r, setActiveReport, setView);
          onClose();
        },
      });
    }

    return list;
  }, [view, activeReport, reports, setView, setActiveReport, patchReportMeta, setActiveSectionId, upsertFinding, onClose, onExportFormat, onOpenCveLookup]);

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
    const g: Record<string, Command[]> = { Navigation: [], Report: [], Editor: [], Library: [] };
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
                placeholder="Search reports, sections, actions…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e6edf3', fontSize: 14, fontFamily: 'inherit',
                }}
              />
              <span style={{ fontSize: 9, color: '#4a5568', fontFamily: 'JetBrains Mono, monospace',
                             border: '1px solid rgba(42,51,71,0.6)', padding: '1px 5px', borderRadius: 4 }}>
                ⌘K
              </span>
            </div>

            {/* Results list */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>
                  No matches
                </div>
              ) : (
                (['Navigation', 'Report', 'Editor', 'Library'] as const).map(group => (
                  grouped[group].length > 0 && (
                    <div key={group} style={{ marginBottom: 4 }}>
                      <div style={{
                        padding: '6px 12px 4px',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: '#4a5568',
                      }}>{group}</div>
                      {grouped[group].map(c => {
                        const flatIdx = filtered.indexOf(c);
                        const active = flatIdx === activeIdx;
                        return (
                          <button
                            key={c.id}
                            onClick={() => c.run()}
                            onMouseEnter={() => setActive(flatIdx)}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10,
                              background: active ? 'rgba(63,185,80,0.10)' : 'transparent',
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
                        );
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
  );
}

// Open a report by setting active + switching view
function openReport(
  r: Report,
  setActiveReport: (r: Report | null) => void,
  setView: (v: 'library' | 'editor' | 'wizard') => void,
) {
  setActiveReport(r);
  setView('editor');
}
