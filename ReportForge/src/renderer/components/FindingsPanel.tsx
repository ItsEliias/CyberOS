import { useState } from 'react';
import { useStore } from '../store';
import { makeBlankFinding, SEVERITIES, SEV_COLORS } from '../lib/defaults';
import { SeverityBadge, SeveritySummary } from './SeverityBadge';
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

  const sorted = [...findings].sort((a, b) => {
    return SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Findings</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>({findings.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {findings.length > 0 && (
            <button
              className="btn-ghost"
              style={{ padding: '3px 10px', fontSize: 11, color: showChart ? 'var(--accent)' : undefined }}
              onClick={() => setShowChart(v => !v)}
              title="Toggle severity chart"
            >
              Chart
            </button>
          )}
          <button className="btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => setShowImport(true)} title="Import findings from ReconDesk">
            Import
          </button>
          <button className="btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={openNew}>
            + Add
          </button>
        </div>
      </div>

      {/* Severity summary + chart */}
      {findings.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <SeveritySummary findings={findings} />
          {showChart && <SeverityChart findings={findings} />}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {findings.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No findings yet.
            <br />
            <button className="btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={openNew}>Add first finding</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>Title</th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, width: 90 }}>Severity</th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, width: 90 }}>CVSS</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(f => (
                <tr
                  key={f.id}
                  onClick={() => openEdit(f.id)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: activeFindingId === f.id ? 'rgba(63,185,80,0.06)' : 'transparent',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => { if (activeFindingId !== f.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeFindingId === f.id ? 'rgba(63,185,80,0.06)' : 'transparent'; }}
                >
                  <td style={{ padding: '9px 16px', fontSize: 13, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: SEV_COLORS[f.severity as Severity], flexShrink: 0 }} />
                      {f.title}
                    </div>
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td style={{ padding: '9px 8px', fontSize: 12, color: 'var(--text-dim)' }}>
                    {f.cvss || '—'}
                  </td>
                  <td style={{ padding: '9px 8px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { if (confirm(`Delete "${f.title}"?`)) removeFinding(f.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px', fontSize: 13 }}
                      title="Delete finding"
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && (
        <FindingEditor findingId={editingId} onClose={closeEditor} />
      )}

      {showImport && (
        <ImportFindingsModal onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
