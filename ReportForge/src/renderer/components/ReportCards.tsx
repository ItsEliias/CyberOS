// ReportCards — card, row, and skeleton components for ReportLibrary
import { motion } from 'framer-motion';

export function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      style={{ background: 'var(--surface-1)', border: '1px solid rgba(42,51,71,0.6)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
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
import { SeveritySummary } from './SeverityBadge';
import type { Report } from '@shared/types';

export interface CardProps {
  report: Report;
  index: number;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export type ReportTypeBadge = { label: string; color: string; bg: string; border: string };

export function timeAgoShort(iso: string): string {
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

export function getReportType(platform: string): ReportTypeBadge {
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

function getCardGradient(reportType: ReportTypeBadge): string {
  const c = reportType.color;
  return `linear-gradient(135deg, ${c}22 0%, ${c}0a 55%, transparent 100%)`;
}

export function StatusPill({ status }: { status: 'draft' | 'complete' }) {
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

export function EmptyState({ onNew }: { onNew: () => void }) {
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

export function ReportCard({ report: r, index, onOpen, onDuplicate, onDelete }: CardProps) {
  const reportType = getReportType(r.platform || '');
  const critCount  = r.findings.filter(f => f.severity === 'critical').length;
  const highCount  = r.findings.filter(f => f.severity === 'high').length;
  const dateLabel  = r.assessmentDate
    ? new Date(r.assessmentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : timeAgoShort(r.updatedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={onOpen}
      style={{
        background: 'var(--surface-1)', border: '1px solid rgba(42,51,71,0.75)',
        borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        position: 'relative', overflow: 'hidden',
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
      {/* Gradient header */}
      <div style={{
        background: getCardGradient(reportType), borderBottom: `1px solid ${reportType.border}`,
        padding: '12px 16px 10px', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, position: 'relative' }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 99, background: reportType.bg, color: reportType.color, border: `1px solid ${reportType.border}` }}>
            {reportType.label}
          </span>
          <StatusPill status={r.status} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em', position: 'relative' }}>
          {r.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, position: 'relative' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{dateLabel}</span>
          {r.operator && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.operator}</span>}
        </div>
        {(critCount > 0 || highCount > 0) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, position: 'relative' }}>
            {critCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(248,81,73,0.18)', color: '#f85149', border: '1px solid rgba(248,81,73,0.35)' }}>{critCount} CRIT</span>}
            {highCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(255,140,66,0.18)', color: '#ff8c42', border: '1px solid rgba(255,140,66,0.35)' }}>{highCount} HIGH</span>}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div className="flex gap-2 flex-wrap" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {r.platform && <span style={{ background: 'var(--surface-2)', border: '1px solid rgba(42,51,71,0.7)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.platform}</span>}
          {r.targetName && <span style={{ color: 'var(--text-secondary)' }}>{r.targetName}</span>}
          {r.targetIP && <span style={{ color: '#4a9eff', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.targetIP}</span>}
        </div>
        <SeveritySummary findings={r.findings} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.findings.length === 0 ? 'No findings' : `${r.findings.length} finding${r.findings.length !== 1 ? 's' : ''}`}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{timeAgoShort(r.updatedAt)}</span>
        </div>
        <div className="flex gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={onOpen} className="flex-1 h-7 text-xs font-semibold transition-all" style={{ background: 'rgba(74,158,255,0.12)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 8 }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.22)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.12)'; }}>Open</button>
          <button onClick={onDuplicate} title="Duplicate" className="h-7 px-3 text-xs font-medium transition-all" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(42,51,71,0.7)', borderRadius: 8 }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>Copy</button>
          <button onClick={onDelete} title="Delete" className="h-7 px-2.5 text-xs transition-all" style={{ background: 'rgba(248,81,73,0.08)', color: '#f85149', border: '1px solid rgba(248,81,73,0.20)', borderRadius: 8 }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.18)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.08)'; }}>✕</button>
        </div>
      </div>
    </motion.div>
  );
}

/** Compact list-row layout for list view mode */
export function ReportListRow({ report: r, index, onOpen, onDuplicate, onDelete }: CardProps) {
  const reportType = getReportType(r.platform || '');
  const critCount  = r.findings.filter(f => f.severity === 'critical').length;
  const highCount  = r.findings.filter(f => f.severity === 'high').length;
  const dateLabel  = r.assessmentDate
    ? new Date(r.assessmentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : timeAgoShort(r.updatedAt);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2 }}
      onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderRadius: 6, background: 'var(--surface-1)', border: '1px solid rgba(42,51,71,0.6)', transition: 'border-color 0.15s, background 0.15s' }}
      whileHover={{ backgroundColor: 'rgba(42,51,71,0.35)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(74,158,255,0.35)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(42,51,71,0.6)'; }}
    >
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 99, flexShrink: 0, background: reportType.bg, color: reportType.color, border: `1px solid ${reportType.border}` }}>{reportType.label}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
      {critCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(248,81,73,0.18)', color: '#f85149', border: '1px solid rgba(248,81,73,0.35)', flexShrink: 0 }}>{critCount} CRIT</span>}
      {highCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(255,140,66,0.18)', color: '#ff8c42', border: '1px solid rgba(255,140,66,0.35)', flexShrink: 0 }}>{highCount} HIGH</span>}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{r.findings.length} findings</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>{dateLabel}</span>
      <StatusPill status={r.status} />
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button onClick={onOpen} style={{ height: 24, padding: '0 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, cursor: 'pointer', background: 'rgba(74,158,255,0.12)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.25)' }}>Open</button>
        <button onClick={onDelete} style={{ height: 24, padding: '0 7px', fontSize: 10, borderRadius: 4, cursor: 'pointer', background: 'rgba(248,81,73,0.08)', color: '#f85149', border: '1px solid rgba(248,81,73,0.20)' }}>✕</button>
      </div>
    </motion.div>
  );
}
