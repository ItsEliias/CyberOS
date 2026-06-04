import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { SeveritySummary } from './SeverityBadge';
import SeverityPill from './ui/SeverityPill';
import type { Report } from '@shared/types';

interface Props {
  onNew: () => void;
  onOpen: (r: Report) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type SortKey = 'recent' | 'title' | 'findings';

export default function ReportLibrary({ onNew, onOpen, onDelete, onDuplicate }: Props) {
  const reports = useStore(s => s.reports);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  const filtered = reports
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.targetName.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q)
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
      {/* Search + sort bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-5"
        style={{
          height: 52,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(13,14,24,0.85)',
          WebkitAppRegion: 'drag' as never,
        }}
      >
        <div style={{ width: 72, flexShrink: 0 }} />

        {/* Search input (no-drag) */}
        <div className="flex items-center gap-2 flex-1 no-drag" style={{ maxWidth: 340 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: '#484f58', flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports…"
            style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13, flex: 1 }}
          />
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
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 h-7 px-3 rounded-sm text-xs font-semibold transition-all"
            style={{ background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.30)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; }}
          >
            <span className="text-sm leading-none">+</span>
            New Report
          </button>
        </div>
      </div>

      {/* Grid / empty state */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {filtered.length === 0 && reports.length === 0 ? (
          <EmptyState onNew={onNew} />
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No reports match "{search}"
          </div>
        ) : (
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
                onDelete={() => { if (confirm(`Delete "${r.title}"?`)) onDelete(r.id); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ padding: '48px 24px' }}>
      <div
        className="flex items-center justify-center mb-5"
        style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(74,158,255,0.08)',
          border: '1px solid rgba(74,158,255,0.18)',
          boxShadow: '0 0 24px rgba(74,158,255,0.10)',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 16 16" fill="none" style={{ color: '#4a9eff' }}>
          <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="12.5" cy="12.5" r="2.5" fill="currentColor" />
        </svg>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
        Professional Security Reports
      </h2>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
        Generate structured pentest reports, vulnerability assessments, and security audit documents. Export to Markdown or PDF.
      </p>

      <div className="flex gap-2 flex-wrap justify-center mb-7">
        {['Pentest Reports', 'Vuln Assessments', 'Audit Docs', 'PDF Export'].map(label => (
          <span key={label} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 99,
            background: 'rgba(74,158,255,0.08)',
            border: '1px solid rgba(74,158,255,0.18)',
            color: 'var(--text-muted)',
          }}>
            {label}
          </span>
        ))}
      </div>

      <button
        onClick={onNew}
        className="flex items-center gap-2 font-semibold transition-all"
        style={{
          padding: '12px 32px', fontSize: 14, borderRadius: 8,
          background: 'rgba(74,158,255,0.15)', color: '#4a9eff',
          border: '1px solid rgba(74,158,255,0.30)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; }}
      >
        Create New Report
      </button>
    </div>
  );
}

interface CardProps {
  report: Report;
  index: number;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ReportCard({ report: r, index, onOpen, onDuplicate, onDelete }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={onOpen}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid rgba(42,51,71,0.75)',
        borderRadius: 10,
        padding: '16px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      whileHover={{ scale: 1.004 }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(74,158,255,0.35)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(74,158,255,0.06)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(42,51,71,0.75)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <div style={{
          fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
        }}>
          {r.title}
        </div>
        <StatusPill status={r.status} />
      </div>

      {/* Meta row */}
      <div className="flex gap-2 flex-wrap" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {r.platform && (
          <span style={{
            background: 'var(--surface-2)', border: '1px solid rgba(42,51,71,0.7)',
            borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {r.platform}
          </span>
        )}
        {r.targetName && <span>{r.targetName}</span>}
        {r.targetIP && (
          <span style={{ color: '#4a9eff', fontFamily: 'var(--font-mono)' }}>{r.targetIP}</span>
        )}
        <span>{r.assessmentDate}</span>
      </div>

      {/* Severity summary */}
      <SeveritySummary findings={r.findings} />

      {/* Finding count */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {r.findings.length === 0
          ? 'No findings'
          : `${r.findings.length} finding${r.findings.length !== 1 ? 's' : ''}`}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={onOpen}
          className="flex-1 h-7 text-xs font-semibold rounded-sm transition-all"
          style={{ background: 'rgba(74,158,255,0.12)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.25)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.20)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.12)'; }}
        >
          Open
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate report"
          className="h-7 px-3 text-xs font-medium rounded-sm transition-all"
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(42,51,71,0.7)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          Copy
        </button>
        <button
          onClick={onDelete}
          title="Delete report"
          className="h-7 px-2.5 text-xs rounded-sm transition-all"
          style={{ background: 'rgba(248,81,73,0.08)', color: '#f85149', border: '1px solid rgba(248,81,73,0.20)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.08)'; }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

function StatusPill({ status }: { status: 'draft' | 'complete' }) {
  const isDraft = status !== 'complete';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      padding: '2px 8px', borderRadius: 99, flexShrink: 0,
      background: isDraft ? 'rgba(210,153,34,0.12)' : 'rgba(63,185,80,0.12)',
      color: isDraft ? '#d29922' : '#3fb950',
      border: `1px solid ${isDraft ? 'rgba(210,153,34,0.3)' : 'rgba(63,185,80,0.3)'}`,
    }}>
      {status}
    </span>
  );
}

// Re-export SeverityPill so FindingsPanel import still resolves
export { SeverityPill };
