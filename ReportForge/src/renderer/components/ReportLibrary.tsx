import { useState, useEffect } from 'react';
import { useStore } from '../store';
import SeverityPill from './ui/SeverityPill';
import HelpTip from './ui/HelpTip';
import type { Report } from '@shared/types';
import { ReportCard, ReportListRow, EmptyState, SkeletonCard } from './ReportCards';

interface Props {
  onNew: () => void;
  onOpen: (r: Report) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type SortKey = 'recent' | 'title' | 'findings';
type ViewMode = 'grid' | 'list';

function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="0.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <line x1="3" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="1" cy="3" r="0.7" fill="currentColor" />
      <circle cx="1" cy="6.5" r="0.7" fill="currentColor" />
      <circle cx="1" cy="10" r="0.7" fill="currentColor" />
    </svg>
  );
}

export default function ReportLibrary({ onNew, onOpen, onDelete, onDuplicate }: Props) {
  const reports = useStore(s => s.reports);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);
  const [deleteArmed, setDeleteArmed] = useState<string | null>(null);

  function armOrDelete(id: string) {
    if (deleteArmed === id) {
      onDelete(id);
      setDeleteArmed(null);
    } else {
      setDeleteArmed(id);
      setTimeout(() => setDeleteArmed(prev => prev === id ? null : prev), 4000);
    }
  }
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('rf-view-mode') as ViewMode) ?? 'grid'; } catch { return 'grid'; }
  });

  function toggleViewMode() {
    const next: ViewMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    try { localStorage.setItem('rf-view-mode', next); } catch { /* ignore */ }
  }

  // Brief skeleton loader on first mount — reports load async from disk
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(id);
  }, []);

  const filtered = reports
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.targetName.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q) ||
        (r.operator ?? '').toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      if (sort === 'title')    return a.title.localeCompare(b.title);
      if (sort === 'findings') return b.findings.length - a.findings.length;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-0)' }}>
      {/* Library header — identity lockup + search + sort bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4"
        style={{
          height: 44,
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-0)',
          WebkitAppRegion: 'drag' as never,
        }}
      >
        <div style={{ width: 72, flexShrink: 0 }} />

        {/* App identity lockup */}
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Document/scroll glyph */}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"
            stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.85 }}
          >
            <rect x="2.5" y="1.5" width="9" height="12" rx="1" />
            <path d="M5 5h5M5 7.5h5M5 10h3" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, lineHeight: 1 }}>
            <span style={{ fontSize: 'var(--type-body-md)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
              ReportForge
            </span>
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              ╱ library
            </span>
          </div>
          <HelpTip
            title="Report Library"
            body="Every saved report lives here. Search by title, target, or operator; switch between grid and list views; click any card to open the editor."
          />
        </div>

        {/* Search input with clear button (no-drag) */}
        <div className="flex items-center gap-2 flex-1 no-drag" style={{ maxWidth: 340, position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: '#484f58', flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, operator, or target…"
            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13, flex: 1, paddingRight: search ? 20 : 0 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              title="Clear search"
              style={{
                position: 'absolute', right: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#484f58', fontSize: 14, lineHeight: 1, padding: '0 2px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484f58'; }}
            >
              ×
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Sort + count + new (no-drag) */}
        <div className="flex items-center gap-3 no-drag">
          <label className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#484f58' }}>
            Sort:
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{ fontSize: 11, padding: '3px 6px', background: 'var(--surface-2)', border: '1px solid rgba(42,51,71,0.7)', borderRadius: 4 }}
            >
              <option value="recent">Recent</option>
              <option value="title">Title</option>
              <option value="findings">Findings</option>
            </select>
          </label>
          <span style={{ fontSize: 11, color: '#484f58' }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>

          {/* Grid / list toggle */}
          <div style={{ display: 'flex', border: '1px solid rgba(42,51,71,0.7)', borderRadius: 4, overflow: 'hidden' }}>
            {(['grid', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={mode !== viewMode ? toggleViewMode : undefined}
                title={mode === 'grid' ? 'Grid view' : 'List view'}
                style={{
                  height: 27, padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  background: viewMode === mode ? 'rgba(74,158,255,0.12)' : 'transparent',
                  color: viewMode === mode ? '#4a9eff' : '#484f58',
                  border: 'none', transition: 'background 0.15s, color 0.15s',
                }}
              >
                {mode === 'grid' ? <GridIcon /> : <ListIcon />}
              </button>
            ))}
          </div>

          <button
            onClick={onNew}
            className="flex items-center gap-1.5 h-7 px-3 rounded-sm font-semibold transition-all"
            style={{
              fontSize: 'var(--type-label)',
              background: 'var(--accent-tint2)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-tint3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-tint2)'; }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
            New Report
          </button>
        </div>
      </div>

      {/* Grid / empty state */}
      <div className="content-stream-in" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        ) : filtered.length === 0 && reports.length === 0 ? (
          <EmptyState onNew={onNew} />
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No reports match "{search}"
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))',
            gap: 14,
          }}>
            {filtered.map((r, i) => (
              <ReportCard
                key={r.id}
                report={r}
                index={i}
                onOpen={() => onOpen(r)}
                onDuplicate={() => onDuplicate(r.id)}
                onDelete={() => armOrDelete(r.id)}
                deleteArmed={deleteArmed === r.id}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((r, i) => (
              <ReportListRow
                key={r.id}
                report={r}
                index={i}
                onOpen={() => onOpen(r)}
                onDuplicate={() => onDuplicate(r.id)}
                onDelete={() => armOrDelete(r.id)}
                deleteArmed={deleteArmed === r.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export SeverityPill so FindingsPanel import still resolves
export { SeverityPill };
