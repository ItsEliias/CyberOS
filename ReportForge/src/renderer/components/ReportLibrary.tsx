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

export default function ReportLibrary({ onNew, onOpen, onDelete, onDuplicate }: Props) {
  const reports = useStore(s => s.reports);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Report<span style={{ color: 'var(--accent)' }}>Forge</span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Report
        </button>
      </div>

      {/* List */}
      {reports.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: 36 }}>📋</div>
          <p style={{ fontSize: 15 }}>No reports yet</p>
          <button className="btn-primary" onClick={onNew}>Create your first report</button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '14px 18px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-dim)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              onClick={() => onOpen(r)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.title}
                  </div>
                  <div style={{ display: 'flex', gap: 14, color: 'var(--text-dim)', fontSize: 12, marginBottom: 8 }}>
                    <span>{r.targetName || '—'}</span>
                    {r.targetIP && <span style={{ color: 'var(--accent-dim)' }}>{r.targetIP}</span>}
                    <span style={{ color: 'var(--text-muted)' }}>{r.platform}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{r.assessmentDate}</span>
                  </div>
                  <SeveritySummary findings={r.findings} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => onDuplicate(r.id)}
                    title="Duplicate"
                  >
                    Copy
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => {
                      if (confirm(`Delete "${r.title}"?`)) onDelete(r.id);
                    }}
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
