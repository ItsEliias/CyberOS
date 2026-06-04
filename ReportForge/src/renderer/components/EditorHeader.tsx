import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { SeveritySummary } from './SeverityBadge';
import VariablesPanel from './VariablesPanel';
import type { WatermarkLabel } from '@shared/types';

const WATERMARKS: WatermarkLabel[] = ['none', 'CONFIDENTIAL', 'DRAFT', 'FOR REVIEW'];

interface Props {
  dirty: boolean;
  onSave: () => void;
  onBack: () => void;
  onExportMd: () => void;
  onExportPdf: () => void;
  exporting: boolean;
}

export default function EditorHeader({ dirty, onSave, onBack, onExportMd, onExportPdf, exporting }: Props) {
  const { activeReport, patchReportMeta, snapshotVersion } = useStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(activeReport?.title ?? '');
  const [showVersions, setShowVersions] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');

  if (!activeReport) return null;

  function commitTitle() {
    setEditingTitle(false);
    if (titleVal.trim()) patchReportMeta({ title: titleVal.trim() });
    else setTitleVal(activeReport!.title);
  }

  const handleSnapshot = useCallback(() => {
    const label = versionLabel.trim() || `Snapshot ${new Date().toLocaleString()}`;
    snapshotVersion(label);
    setVersionLabel('');
    setShowVersions(false);
  }, [versionLabel, snapshotVersion]);

  const versions = activeReport.versions ?? [];

  return (
    <>
      <div style={{
        height: 52, flexShrink: 0,
        background: 'var(--panel)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        WebkitAppRegion: 'drag' as never,
      }}>
        {/* Drag spacer for traffic lights */}
        <div style={{ width: 72, flexShrink: 0 }} />

        <button
          className="btn-ghost"
          onClick={onBack}
          style={{ padding: '4px 10px', fontSize: 12, WebkitAppRegion: 'no-drag' as never, flexShrink: 0 }}
        >
          ← Library
        </button>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0, WebkitAppRegion: 'no-drag' as never }}>
          {editingTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(activeReport.title); } }}
              style={{ background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 4, padding: '3px 8px', fontSize: 14, fontWeight: 600, width: '100%', maxWidth: 340 }}
            />
          ) : (
            <div
              onClick={() => { setEditingTitle(true); setTitleVal(activeReport.title); }}
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title="Click to rename"
            >
              {activeReport.title}
              {dirty && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 12, fontWeight: 400 }}>•</span>}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {activeReport.targetName}{activeReport.targetIP ? ` · ${activeReport.targetIP}` : ''} · {activeReport.platform} · {activeReport.assessmentDate}
          </div>
        </div>

        {/* Severity summary */}
        <div style={{ flexShrink: 0, WebkitAppRegion: 'no-drag' as never }}>
          <SeveritySummary findings={activeReport.findings} />
        </div>

        {/* Status toggle */}
        <button
          onClick={() => patchReportMeta({ status: activeReport.status === 'complete' ? 'draft' : 'complete' })}
          title="Toggle report status"
          style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 700,
            borderRadius: 99, flexShrink: 0,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            cursor: 'pointer',
            background: activeReport.status === 'complete' ? 'rgba(63,185,80,0.15)' : 'rgba(240,165,0,0.15)',
            color: activeReport.status === 'complete' ? 'var(--success)' : 'var(--warning)',
            border: `1px solid ${activeReport.status === 'complete' ? 'rgba(63,185,80,0.3)' : 'rgba(240,165,0,0.3)'}`,
            WebkitAppRegion: 'no-drag' as never,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {activeReport.status}
        </button>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, WebkitAppRegion: 'no-drag' as never }}>
          {/* Variables */}
          <button
            className="btn-ghost"
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setShowVariables(true)}
            title="Edit report variables ({{client_name}}, etc.)"
          >
            {'{}'} Vars
          </button>

          {/* Settings (watermark) */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-ghost"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setShowSettings(v => !v)}
              title="Report settings"
            >
              Settings
            </button>
            {showSettings && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowSettings(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, zIndex: 200, minWidth: 200, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Watermark</div>
                  {WATERMARKS.map(w => (
                    <label key={w} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12 }}>
                      <input
                        type="radio"
                        name="watermark"
                        checked={(activeReport.watermark ?? 'none') === w}
                        onChange={() => { patchReportMeta({ watermark: w }); }}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ color: w === 'none' ? 'var(--text-muted)' : 'var(--text)' }}>{w === 'none' ? 'None' : w}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Version history */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-ghost"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setShowVersions(v => !v)}
              title="Version history"
            >
              History {versions.length > 0 ? `(${versions.length})` : ''}
            </button>
            {showVersions && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowVersions(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, zIndex: 200, width: 280, maxHeight: 360, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Snapshot input */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                    <input
                      value={versionLabel}
                      onChange={e => setVersionLabel(e.target.value)}
                      placeholder={`Draft v${versions.length + 1}`}
                      style={{ flex: 1, fontSize: 11 }}
                      onKeyDown={e => e.key === 'Enter' && handleSnapshot()}
                    />
                    <button className="btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={handleSnapshot}>
                      Save
                    </button>
                  </div>

                  {/* History list */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {versions.length === 0 ? (
                      <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No saved versions</div>
                    ) : versions.map(v => (
                      <div key={v.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                          {new Date(v.createdAt).toLocaleString()} · {v.sectionCount} sections
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            className="btn-ghost"
            style={{ padding: '4px 12px', fontSize: 12, color: dirty ? 'var(--accent)' : undefined }}
            onClick={onSave}
            disabled={!dirty}
          >
            {dirty ? 'Save*' : 'Saved'}
          </button>

          <div style={{ position: 'relative' }}>
            <button
              className="btn-primary"
              style={{ padding: '4px 12px', fontSize: 12 }}
              disabled={exporting}
              onClick={() => setShowExportMenu(v => !v)}
            >
              {exporting ? 'Exporting…' : 'Export ▾'}
            </button>
            {showExportMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowExportMenu(false)} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 6, overflow: 'hidden', zIndex: 200, minWidth: 160
                }}>
                  <MenuItem onClick={() => { setShowExportMenu(false); onExportMd(); }}>Export Markdown</MenuItem>
                  <MenuItem onClick={() => { setShowExportMenu(false); onExportPdf(); }}>Export PDF</MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Variables panel */}
      {showVariables && <VariablesPanel onClose={() => setShowVariables(false)} />}
    </>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '9px 16px', textAlign: 'left',
        background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer'
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}
