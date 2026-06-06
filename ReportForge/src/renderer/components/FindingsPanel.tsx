import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { makeBlankFinding, SEVERITIES, SEV_COLORS } from '../lib/defaults';
import { SeveritySummary } from './SeverityBadge';
import SeverityPill from './ui/SeverityPill';
import HelpTip from './ui/HelpTip';
import FindingEditor from './FindingEditor';
import ImportFindingsModal from './ImportFindingsModal';
import SeverityChart from './SeverityChart';
import { SeverityDonut, CvssBadge, FindingsSeverityGroups, FindingsEmptyState } from './FindingsParts';
import type { Severity } from '@shared/types';


export default function FindingsPanel() {
  const { activeReport, setActiveFindingId, activeFindingId, removeFinding } = useStore();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [groupBySev, setGroupBySev] = useState(false);
  const [collapsedSevs, setCollapsedSevs] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSevCollapse(sev: string) {
    setCollapsedSevs(prev => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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
          <HelpTip
            title="Findings Panel"
            body="Catalog every vulnerability with severity, CVSS, evidence, and remediation. Group by severity, toggle the chart, or import from ReconDesk."
          />
        </div>

        <div className="flex gap-1.5">
          {findings.length > 0 && (
            <button
              onClick={() => setGroupBySev(v => !v)}
              title="Toggle group by severity"
              style={{
                height: 27, padding: '0 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                background: groupBySev ? 'rgba(210,153,34,0.12)' : 'transparent',
                color: groupBySev ? '#d29922' : 'var(--text-muted)',
                border: `1px solid ${groupBySev ? 'rgba(210,153,34,0.25)' : 'rgba(42,51,71,0.7)'}`,
                transition: 'all 0.15s',
              }}
            >
              Group
            </button>
          )}
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

      {/* Mini severity donut */}
      {findings.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <SeverityDonut findings={findings} />
        </div>
      )}

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
        ) : groupBySev ? (
          <FindingsSeverityGroups
            sorted={sorted}
            activeFindingId={activeFindingId}
            collapsedSevs={collapsedSevs}
            onEdit={openEdit}
            onToggleCollapse={toggleSevCollapse}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                fontSize: 10, color: 'var(--text-muted)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <th style={{ padding: '7px 12px', width: 32 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === sorted.length}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(new Set(sorted.map(f => f.id)));
                      else clearSelection();
                    }}
                    style={{ accentColor: '#4a9eff', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Title</th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, width: 100 }}>Severity</th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, width: 80 }}>CVSS</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(f => {
                const isActive = activeFindingId === f.id;
                const isChecked = selectedIds.has(f.id);
                const sevColor = SEV_COLORS[f.severity as Severity];
                return (
                  <tr
                    key={f.id}
                    onClick={() => openEdit(f.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(74,158,255,0.07)' : isActive ? `${sevColor}0d` : 'transparent',
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isActive && !isChecked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isChecked ? 'rgba(74,158,255,0.07)' : isActive ? `${sevColor}0d` : 'transparent'; }}
                  >
                    <td style={{ padding: '9px 12px' }} onClick={e => { e.stopPropagation(); toggleSelect(f.id); }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(f.id)}
                        style={{ accentColor: '#4a9eff', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '9px 8px', fontSize: 13, color: 'var(--text-primary)' }}>
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
                    <td style={{ padding: '9px 8px' }}>
                      <CvssBadge score={f.cvss} />
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

          {/* Bulk action bar — slides up when items selected */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ y: 56, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 56, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                style={{
                  position: 'sticky', bottom: 0,
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  background: 'rgba(13,14,24,0.96)',
                  borderTop: '1px solid rgba(74,158,255,0.25)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4a9eff', flex: 1 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  style={{
                    padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(210,153,34,0.12)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)',
                  }}
                >
                  Change Severity
                </button>
                <button
                  style={{
                    padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)',
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={clearSelection}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {showEditor && <FindingEditor findingId={editingId} onClose={closeEditor} />}
      {showImport && <ImportFindingsModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
