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
  metaOpen?: boolean;
  onToggleMeta?: () => void;
}

export default function EditorHeader({ dirty, onSave, onBack, onExportMd, onExportPdf, exporting, metaOpen, onToggleMeta }: Props) {
  const { activeReport, patchReportMeta, snapshotVersion } = useStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(activeReport?.title ?? '');
  const [showVersions, setShowVersions] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [versionBadgeHovered, setVersionBadgeHovered] = useState(false);

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
  const isDraft = activeReport.status !== 'complete';

  return (
    <>
      <div
        style={{
          height: 52, flexShrink: 0,
          background: 'rgba(7,8,15,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
          WebkitAppRegion: 'drag' as never,
        }}
      >
        {/* Traffic-light spacer */}
        <div style={{ width: 72, flexShrink: 0 }} />

        <button
          onClick={onBack}
          style={{
            height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
            borderRadius: 4, cursor: 'pointer', flexShrink: 0,
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid rgba(42,51,71,0.7)',
            WebkitAppRegion: 'no-drag' as never, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
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
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(activeReport.title); }
              }}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--accent)',
                borderRadius: 4, padding: '3px 8px', fontSize: 14, fontWeight: 600,
                width: '100%', maxWidth: 340, color: 'var(--text-primary)',
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <div
                onClick={() => { setEditingTitle(true); setTitleVal(activeReport.title); }}
                style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                  cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title="Click to rename"
              >
                {dirty && (
                  <span
                    style={{
                      color: '#d29922',
                      marginRight: 4,
                      fontSize: 16,
                      lineHeight: 1,
                      verticalAlign: 'middle',
                    }}
                    title="Unsaved changes"
                  >
                    •
                  </span>
                )}
                {activeReport.title}
              </div>
              {/* Version badge with hover tooltip */}
              <VersionBadge count={versions.length} />
              {dirty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#d29922',
                    boxShadow: '0 0 5px rgba(210,153,34,0.6)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 10, color: '#d29922', fontWeight: 500 }}>unsaved</span>
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
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
            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
            background: isDraft ? 'rgba(210,153,34,0.12)' : 'rgba(63,185,80,0.12)',
            color: isDraft ? '#d29922' : '#3fb950',
            border: `1px solid ${isDraft ? 'rgba(210,153,34,0.3)' : 'rgba(63,185,80,0.3)'}`,
            WebkitAppRegion: 'no-drag' as never, transition: 'all 0.15s',
          }}
        >
          {activeReport.status}
        </button>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, WebkitAppRegion: 'no-drag' as never }}>
          {/* Report metadata sidebar toggle */}
          {onToggleMeta && (
            <button
              onClick={onToggleMeta}
              title="Toggle report info panel"
              style={{
                height: 28, padding: '0 10px', fontSize: 11, fontWeight: 500, borderRadius: 4, cursor: 'pointer',
                background: metaOpen ? 'rgba(74,158,255,0.12)' : 'transparent',
                color: metaOpen ? '#4a9eff' : 'var(--text-secondary)',
                border: `1px solid ${metaOpen ? 'rgba(74,158,255,0.30)' : 'rgba(42,51,71,0.7)'}`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!metaOpen) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; } }}
              onMouseLeave={e => { if (!metaOpen) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
            >
              Info
            </button>
          )}

          <GhostBtn onClick={() => setShowVariables(true)}>
            {'{}'} Vars
          </GhostBtn>

          {/* Settings dropdown */}
          <div style={{ position: 'relative' }}>
            <GhostBtn onClick={() => setShowSettings(v => !v)}>Settings</GhostBtn>
            {showSettings && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowSettings(false)} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--surface-1)', border: '1px solid rgba(42,51,71,0.75)',
                  borderRadius: 6, zIndex: 200, minWidth: 200, padding: '10px 14px',
                  boxShadow: 'var(--elevation-3)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Watermark</div>
                  {WATERMARKS.map(w => (
                    <label key={w} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12 }}>
                      <input
                        type="radio"
                        name="watermark"
                        checked={(activeReport.watermark ?? 'none') === w}
                        onChange={() => patchReportMeta({ watermark: w })}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ color: w === 'none' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {w === 'none' ? 'None' : w}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Version history dropdown */}
          <div style={{ position: 'relative' }}>
            <GhostBtn onClick={() => setShowVersions(v => !v)}>
              History{versions.length > 0 ? ` (${versions.length})` : ''}
            </GhostBtn>
            {showVersions && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowVersions(false)} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--surface-1)', border: '1px solid rgba(42,51,71,0.75)',
                  borderRadius: 6, zIndex: 200, width: 280, maxHeight: 360,
                  overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  boxShadow: 'var(--elevation-3)',
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(42,51,71,0.6)', display: 'flex', gap: 6 }}>
                    <input
                      value={versionLabel}
                      onChange={e => setVersionLabel(e.target.value)}
                      placeholder={`Draft v${versions.length + 1}`}
                      style={{ flex: 1, fontSize: 11 }}
                      onKeyDown={e => e.key === 'Enter' && handleSnapshot()}
                    />
                    <button
                      onClick={handleSnapshot}
                      style={{
                        padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(74,158,255,0.15)', color: '#4a9eff',
                        border: '1px solid rgba(74,158,255,0.30)',
                      }}
                    >Save</button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {versions.length === 0 ? (
                      <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No saved versions</div>
                    ) : versions.map(v => (
                      <div key={v.id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(42,51,71,0.5)', fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
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
            onClick={onSave}
            disabled={!dirty}
            style={{
              height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500, borderRadius: 4, cursor: 'pointer',
              background: 'transparent', transition: 'all 0.15s',
              color: dirty ? '#4a9eff' : 'var(--text-muted)',
              border: `1px solid ${dirty ? 'rgba(74,158,255,0.35)' : 'rgba(42,51,71,0.5)'}`,
            }}
          >
            {dirty ? 'Save*' : 'Saved'}
          </button>

          <div style={{ position: 'relative' }}>
            <button
              disabled={exporting}
              onClick={() => setShowExportMenu(v => !v)}
              style={{
                height: 28, padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                background: 'rgba(74,158,255,0.15)', color: '#4a9eff',
                border: '1px solid rgba(74,158,255,0.30)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; }}
            >
              {exporting ? 'Exporting…' : 'Export ▾'}
            </button>
            {showExportMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowExportMenu(false)} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--surface-1)', border: '1px solid rgba(42,51,71,0.75)',
                  borderRadius: 6, overflow: 'hidden', zIndex: 200, minWidth: 160,
                  boxShadow: 'var(--elevation-3)',
                }}>
                  <MenuItem onClick={() => { setShowExportMenu(false); onExportMd(); }}>Export Markdown</MenuItem>
                  <MenuItem onClick={() => { setShowExportMenu(false); onExportPdf(); }}>Export PDF</MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showVariables && <VariablesPanel onClose={() => setShowVariables(false)} />}
    </>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: '0 10px', fontSize: 11, fontWeight: 500, borderRadius: 4, cursor: 'pointer',
        background: 'transparent', color: 'var(--text-secondary)',
        border: '1px solid rgba(42,51,71,0.7)', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '9px 16px', textAlign: 'left',
        background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
    >
      {children}
    </button>
  );
}

// ── Version badge with hover tooltip ─────────────────────────────────────────
function VersionBadge({ count }: { count: number }) {
  const [hovered, setHovered] = useState(false);
  const vNum = count > 0 ? count : 1;
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', flexShrink: 0 }}
    >
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
        background: 'rgba(74,158,255,0.12)', color: '#4a9eff',
        border: '1px solid rgba(74,158,255,0.25)',
        letterSpacing: '0.02em', cursor: 'default',
        userSelect: 'none',
      }}>
        V{vNum}
      </span>
      {hovered && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 5, whiteSpace: 'nowrap',
          background: 'rgba(13,14,24,0.97)', border: '1px solid rgba(42,51,71,0.75)',
          borderRadius: 5, padding: '5px 8px', fontSize: 11,
          color: 'var(--text-secondary)', zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {count === 0 ? 'No saved versions' : `${count} version${count !== 1 ? 's' : ''} saved`}
        </span>
      )}
    </span>
  );
}
