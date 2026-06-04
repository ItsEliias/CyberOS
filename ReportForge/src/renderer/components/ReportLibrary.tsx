import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { SeveritySummary } from './SeverityBadge';
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
      // recent: newest updatedAt first
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div style={{
        height: 52, flexShrink: 0,
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        WebkitAppRegion: 'drag' as never,
      }}>
        <div style={{ width: 72, flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' as never }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)', flexShrink: 0 }}>
            <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="12.5" cy="12.5" r="2.5" fill="currentColor" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Report<span style={{ color: 'var(--accent)' }}>Forge</span>
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' as never }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
          <button className="btn-primary" onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', fontSize: 12 }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New Report
          </button>
        </div>
      </div>

      {/* Search + sort bar */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)',
        flexShrink: 0,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search reports…"
          style={{ flex: 1, maxWidth: 320 }}
        />
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Sort:
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            style={{ fontSize: 11, padding: '3px 8px' }}
          >
            <option value="recent">Recent</option>
            <option value="title">Title</option>
            <option value="findings">Findings</option>
          </select>
        </label>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {filtered.length === 0 && reports.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', height: '100%',
            padding: '48px 24px',
          }}>
            {/* App icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(63,185,80,0.1)',
              border: '1px solid rgba(63,185,80,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <svg width="26" height="26" viewBox="0 0 16 16" fill="none" style={{ color: '#3fb950' }}>
                <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1.2" />
                <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
                <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="12.5" cy="12.5" r="2.5" fill="currentColor" />
              </svg>
            </div>

            {/* Heading */}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
              Professional Security Reports
            </h2>

            {/* Description */}
            <p style={{
              fontSize: 13, color: 'var(--text-muted)', maxWidth: 340,
              textAlign: 'center', lineHeight: 1.6, marginBottom: 8,
            }}>
              Generate structured pentest reports, vulnerability assessments, and security audit documents. Export to Markdown or PDF.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
              {['Pentest Reports', 'Vuln Assessments', 'Audit Docs', 'PDF Export'].map(label => (
                <span key={label} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(63,185,80,0.08)',
                  border: '1px solid rgba(63,185,80,0.2)',
                  color: 'var(--text-muted)',
                }}>
                  {label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <button
              className="btn-primary"
              onClick={onNew}
              style={{
                padding: '12px 32px',
                fontSize: 14,
                fontWeight: 600,
                minHeight: 48,
                borderRadius: 8,
              }}
            >
              Create New Report
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No reports match "{search}"
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {filtered.map((r, i) => (
              <ReportCard
                key={r.id}
                report={r}
                index={i}
                onOpen={() => onOpen(r)}
                onDuplicate={() => onDuplicate(r.id)}
                onDelete={() => {
                  if (confirm(`Delete "${r.title}"?`)) onDelete(r.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
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
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
      whileHover={{ scale: 1.005 }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-dim)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Top row: title + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          fontWeight: 600, fontSize: 13, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
        }}>
          {r.title}
        </div>
        <StatusBadge status={r.status} />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
        {r.platform && (
          <span style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {r.platform}
          </span>
        )}
        {r.targetName && <span style={{ color: 'var(--text-dim)' }}>{r.targetName}</span>}
        {r.targetIP && <span style={{ color: 'var(--accent-dim)', fontFamily: 'monospace' }}>{r.targetIP}</span>}
        <span>{r.assessmentDate}</span>
      </div>

      {/* Severity summary */}
      <SeveritySummary findings={r.findings} />

      {/* Finding count */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {r.findings.length === 0
          ? 'No findings'
          : `${r.findings.length} finding${r.findings.length !== 1 ? 's' : ''}`
        }
      </div>

      {/* Action buttons */}
      <div
        style={{ display: 'flex', gap: 6, marginTop: 2 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="btn-primary"
          style={{ flex: 1, padding: '5px 0', fontSize: 11 }}
          onClick={onOpen}
        >
          Open
        </button>
        <button
          className="btn-ghost"
          style={{ padding: '5px 12px', fontSize: 11 }}
          onClick={onDuplicate}
          title="Duplicate report"
        >
          Copy
        </button>
        <button
          className="btn-danger"
          style={{ padding: '5px 10px', fontSize: 11 }}
          onClick={onDelete}
          title="Delete report"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: 'draft' | 'complete' }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      padding: '2px 8px', borderRadius: 99, flexShrink: 0,
      background: status === 'complete' ? 'rgba(63,185,80,0.15)' : 'rgba(240,165,0,0.15)',
      color: status === 'complete' ? 'var(--success)' : 'var(--warning)',
      border: `1px solid ${status === 'complete' ? 'rgba(63,185,80,0.3)' : 'rgba(240,165,0,0.3)'}`,
    }}>
      {status}
    </span>
  );
}
