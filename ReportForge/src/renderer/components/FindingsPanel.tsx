import { useState } from 'react';
import { useStore } from '../store';
import { makeBlankFinding, SEVERITIES, SEV_COLORS } from '../lib/defaults';
import { SeveritySummary } from './SeverityBadge';
import SeverityPill from './ui/SeverityPill';
import FindingEditor from './FindingEditor';
import ImportFindingsModal from './ImportFindingsModal';
import SeverityChart from './SeverityChart';
import type { Severity } from '@shared/types';

export default function FindingsPanel() {
  const { activeReport, setActiveFindingId, activeFindingId, removeFinding } = useStore();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showChart, setShowChart] = useState(false);

  if (!activeReport) return null;

  const findings = activeReport.findings;

  function openNew() {
    setEditingId(null);
    setShowEditor(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setActiveFindingId(id);
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
  }

  const sorted = [...findings].sort((a, b) =>
    SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div
        className="shrink-0 flex items-center justify-between px-4"
        style={{ height: 44, borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(13,14,24,0.6)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-px h-4 rounded-full" style={{ background: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Findings</span>
          <span
            className="text-2xs px-1.5 py-0.5 rounded-xs tabular-nums"
            style={{ background: 'rgba(74,158,255,0.10)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.20)' }}
          >
            {findings.length}
          </span>
        </div>

        <div className="flex gap-1.5">
          {findings.length > 0 && (
            <button
              onClick={() => setShowChart(v => !v)}
              title="Toggle severity chart"
              style={{
                height: 27, padding: '0 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                background: showChart ? 'rgba(74,158,255,0.12)' : 'transparent',
                color: showChart ? '#4a9eff' : 'var(--text-muted)',
                border: `1px solid ${showChart ? 'rgba(74,158,255,0.25)' : 'rgba(42,51,71,0.7)'}`,
                transition: 'all 0.15s',
              }}
            >
              Chart
            </button>
          )}
          <button
            onClick={() => setShowImport(true)}
            title="Import findings from ReconDesk"
            style={{
              height: 27, padding: '0 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid rgba(42,51,71,0.7)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            Import
          </button>
          <button
            onClick={openNew}
            style={{
              height: 27, padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
              background: 'rgba(74,158,255,0.15)', color: '#4a9eff',
              border: '1px solid rgba(74,158,255,0.30)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Severity summary + optional chart */}
      {findings.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <SeveritySummary findings={findings} />
          {showChart && <SeverityChart findings={findings} />}
        </div>
      )}

      {/* Findings list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {findings.length === 0 ? (
          <FindingsEmptyState onAdd={openNew} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                fontSize: 10, color: 'var(--text-muted)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <th style={{ padding: '7px 16px', textAlign: 'left', fontWeight: 600 }}>Title</th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, width: 100 }}>Severity</th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, width: 80 }}>CVSS</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(f => {
                const isActive = activeFindingId === f.id;
                const sevColor = SEV_COLORS[f.severity as Severity];
                return (
                  <tr
                    key={f.id}
                    onClick={() => openEdit(f.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      background: isActive ? `${sevColor}0d` : 'transparent',
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${sevColor}0d` : 'transparent'; }}
                  >
                    <td style={{ padding: '9px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <span style={{
                          width: 3, height: 20, borderRadius: 99,
                          background: isActive ? sevColor : `${sevColor}55`,
                          flexShrink: 0,
                          transition: 'background 0.15s, height 0.15s',
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
                          {f.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 8px' }}>
                      <SeverityPill severity={f.severity as Severity} showDot={false} />
                    </td>
                    <td style={{ padding: '9px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {f.cvss || '—'}
                    </td>
                    <td style={{ padding: '9px 8px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { if (confirm(`Delete "${f.title}"?`)) removeFinding(f.id); }}
                        style={{
                          background: 'none', border: 'none',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          padding: '2px 6px', fontSize: 13, borderRadius: 3,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f85149'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                        title="Delete finding"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && <FindingEditor findingId={editingId} onClose={closeEditor} />}
      {showImport && <ImportFindingsModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function FindingsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '32px 24px', textAlign: 'center', gap: 0,
    }}>
      {/* Shield illustration */}
      <div style={{
        width: 64, height: 64, borderRadius: 16, marginBottom: 16,
        background: 'rgba(74,158,255,0.06)',
        border: '1px solid rgba(74,158,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 32px rgba(74,158,255,0.08)',
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(74,158,255,0.7)' }}>
          <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
            stroke="currentColor" strokeWidth="1.5" fill="rgba(74,158,255,0.08)" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        No findings yet
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.6, marginBottom: 18 }}>
        Add vulnerabilities, misconfigurations, and security issues discovered during testing.
      </p>

      {/* Severity hint badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
          const colors: Record<string, { bg: string; text: string }> = {
            critical: { bg: 'rgba(248,81,73,0.1)',  text: '#f85149' },
            high:     { bg: 'rgba(255,140,66,0.1)', text: '#ff8c42' },
            medium:   { bg: 'rgba(210,153,34,0.1)', text: '#d29922' },
            low:      { bg: 'rgba(74,158,255,0.1)', text: '#4a9eff' },
          };
          const c = colors[sev];
          return (
            <span key={sev} style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
              padding: '2px 8px', borderRadius: 99,
              background: c.bg, color: c.text,
              border: `1px solid ${c.text}44`,
            }}>
              {sev}
            </span>
          );
        })}
      </div>

      <button
        onClick={onAdd}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 20px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
          background: 'rgba(74,158,255,0.15)', color: '#4a9eff',
          border: '1px solid rgba(74,158,255,0.30)',
          transition: 'all 0.2s var(--ease)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(74,158,255,0.2)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        Add First Finding
      </button>
    </div>
  );
}
