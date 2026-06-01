import { useState } from 'react';
import { useStore } from '../store';
import { SeveritySummary } from './SeverityBadge';

interface Props {
  dirty: boolean;
  onSave: () => void;
  onBack: () => void;
  onExportMd: () => void;
  onExportPdf: () => void;
  exporting: boolean;
}

export default function EditorHeader({ dirty, onSave, onBack, onExportMd, onExportPdf, exporting }: Props) {
  const { activeReport, patchReportMeta } = useStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(activeReport?.title ?? '');

  if (!activeReport) return null;

  function commitTitle() {
    setEditingTitle(false);
    if (titleVal.trim()) patchReportMeta({ title: titleVal.trim() });
    else setTitleVal(activeReport!.title);
  }

  return (
    <div style={{
      height: 52, flexShrink: 0,
      background: 'var(--panel)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, WebkitAppRegion: 'no-drag' as never }}>
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
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                onClick={() => setShowExportMenu(false)}
              />
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
