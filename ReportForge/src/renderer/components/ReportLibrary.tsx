import { useState, useEffect } from 'react';
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

// Skeleton card shown while the library is loading
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid rgba(42,51,71,0.6)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ height: 13, width: '60%', borderRadius: 4, background: 'rgba(42,51,71,0.5)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
        <div style={{ height: 16, width: 44, borderRadius: 99, background: 'rgba(42,51,71,0.4)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ height: 14, width: 36, borderRadius: 4, background: 'rgba(42,51,71,0.4)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
        <div style={{ height: 14, width: 80, borderRadius: 4, background: 'rgba(42,51,71,0.3)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[44, 36, 44, 36].map((w, i) => (
          <div key={i} style={{ height: 18, width: w, borderRadius: 99, background: 'rgba(42,51,71,0.35)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
        ))}
      </div>
      <div style={{ height: 27, borderRadius: 8, background: 'rgba(42,51,71,0.4)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
    </motion.div>
  );
}

export default function ReportLibrary({ onNew, onOpen, onDelete, onDuplicate }: Props) {
  const reports = useStore(s => s.reports);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);

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

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type ReportTypeBadge = { label: string; color: string; bg: string; border: string };

function getReportType(platform: string): ReportTypeBadge {
  const p = platform.toLowerCase();
  if (p.includes('htb') || p.includes('tryhackme') || p.includes('pentest') || p.includes('ptes'))
    return { label: 'Pentest', color: '#ff8c42', bg: 'rgba(255,140,66,0.10)', border: 'rgba(255,140,66,0.25)' };
  if (p.includes('vdp') || p.includes('bug') || p.includes('bounty'))
    return { label: 'VDP', color: '#3fb950', bg: 'rgba(63,185,80,0.10)', border: 'rgba(63,185,80,0.25)' };
  if (p.includes('red') || p.includes('ad') || p.includes('active'))
    return { label: 'Red Team', color: '#f85149', bg: 'rgba(248,81,73,0.10)', border: 'rgba(248,81,73,0.25)' };
  if (p.includes('audit') || p.includes('web') || p.includes('api') || p.includes('mobile'))
    return { label: 'Audit', color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' };
  return { label: 'Pentest', color: '#ff8c42', bg: 'rgba(255,140,66,0.10)', border: 'rgba(255,140,66,0.25)' };
}

function ReportCard({ report: r, index, onOpen, onDuplicate, onDelete }: CardProps) {
  const reportType = getReportType(r.platform || '');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={onOpen}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid rgba(42,51,71,0.75)',
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{ scale: 1.006, y: -2 }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(74,158,255,0.4)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(74,158,255,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(42,51,71,0.75)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Accent glow top-right on hover */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: 'radial-gradient(circle at top right, rgba(74,158,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 13, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>
            {r.title}
          </div>
          {r.operator && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              by {r.operator}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <StatusPill status={r.status} />
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '2px 6px', borderRadius: 99,
            background: reportType.bg, color: reportType.color,
            border: `1px solid ${reportType.border}`,
          }}>
            {reportType.label}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex gap-2 flex-wrap" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {r.platform && (
          <span style={{
            background: 'var(--surface-2)', border: '1px solid rgba(42,51,71,0.7)',
            borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {r.platform}
          </span>
        )}
        {r.targetName && <span style={{ color: 'var(--text-secondary)' }}>{r.targetName}</span>}
        {r.targetIP && (
          <span style={{ color: '#4a9eff', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.targetIP}</span>
        )}
      </div>

      {/* Severity summary */}
      <SeveritySummary findings={r.findings} />

      {/* Bottom row: finding count + last updated */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {r.findings.length === 0
            ? 'No findings'
            : `${r.findings.length} finding${r.findings.length !== 1 ? 's' : ''}`}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {timeAgoShort(r.updatedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={onOpen}
          className="flex-1 h-7 text-xs font-semibold transition-all"
          style={{ background: 'rgba(74,158,255,0.12)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 8 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.22)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(74,158,255,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
        >
          Open
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate report"
          className="h-7 px-3 text-xs font-medium transition-all"
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(42,51,71,0.7)', borderRadius: 8 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          Copy
        </button>
        <button
          onClick={onDelete}
          title="Delete report"
          className="h-7 px-2.5 text-xs transition-all"
          style={{ background: 'rgba(248,81,73,0.08)', color: '#f85149', border: '1px solid rgba(248,81,73,0.20)', borderRadius: 8 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.18)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,81,73,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,81,73,0.20)'; }}
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
