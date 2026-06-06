import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HelpTip from '../ui/HelpTip';

export type ExportFormat = 'markdown' | 'pdf' | 'docx' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeToc: boolean;
  includeFindingsTable: boolean;
  includeCredentials: boolean;
  redactCredentials: boolean;
  includeRawNmap: boolean;
}

interface Props {
  onExport: (opts: ExportOptions) => void;
  onCancel: () => void;
  exporting: boolean;
  defaultFormat?: ExportFormat;
}

const FORMAT_PILLS: { id: ExportFormat; label: string; ext: string }[] = [
  { id: 'pdf',      label: 'PDF',      ext: '.pdf'  },
  { id: 'markdown', label: 'Markdown', ext: '.md'   },
  { id: 'html',     label: 'HTML',     ext: '.html' },
  { id: 'docx',     label: 'DOCX',     ext: '.docx' },
];

export default function ExportModal({ onExport, onCancel, exporting, defaultFormat = 'pdf' }: Props) {
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeFindingsTable, setIncludeFindingsTable] = useState(true);
  const [includeCredentials, setIncludeCredentials] = useState(true);
  const [redactCredentials, setRedactCredentials] = useState(true);
  const [includeRawNmap, setIncludeRawNmap] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState<string>('');

  // Export step messages keyed to approximate progress thresholds
  const EXPORT_STEPS: Array<{ at: number; label: string }> = [
    { at: 0,  label: 'Compiling sections…'  },
    { at: 28, label: 'Rendering content…'   },
    { at: 58, label: 'Packaging assets…'    },
    { at: 80, label: 'Finalising output…'   },
    { at: 95, label: 'Done'                 },
  ];

  // Animate progress bar + step labels when exporting
  useEffect(() => {
    if (!exporting) { setExportProgress(0); setExportStep(''); return; }
    setExportProgress(0);
    setExportStep(EXPORT_STEPS[0].label);
    const start = performance.now();
    const duration = 3200;
    let raf: number;
    function step(now: number) {
      const t = Math.min((now - start) / duration, 0.92);
      const pct = t * 100;
      setExportProgress(pct);
      // Update step label based on progress
      for (let i = EXPORT_STEPS.length - 1; i >= 0; i--) {
        if (pct >= EXPORT_STEPS[i].at) {
          setExportStep(EXPORT_STEPS[i].label);
          break;
        }
      }
      if (t < 0.92) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exporting]);

  function handleExport() {
    onExport({ format, includeToc, includeFindingsTable, includeCredentials, redactCredentials, includeRawNmap });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}
        onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            width: 380,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Export Report</h3>
              <HelpTip
                title="Export"
                body="Render the report to PDF, Markdown, HTML, or DOCX. Toggle the Include options to add a TOC, finding tables, or redact credentials before sharing."
              />
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Format pills */}
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 600 }}>
                Format
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FORMAT_PILLS.map(fp => {
                  const active = format === fp.id;
                  return (
                    <button
                      key={fp.id}
                      onClick={() => setFormat(fp.id)}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: active ? 700 : 500,
                        borderRadius: 99, cursor: 'pointer', transition: 'all 0.15s',
                        background: active ? 'rgba(74,158,255,0.18)' : 'transparent',
                        color: active ? '#4a9eff' : 'var(--text-muted)',
                        border: `1px solid ${active ? 'rgba(74,158,255,0.40)' : 'rgba(42,51,71,0.7)'}`,
                      }}
                    >
                      {fp.label}
                      <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>{fp.ext}</span>
                    </button>
                  );
                })}
              </div>
              {(format === 'docx' || format === 'html') && (
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                  {format === 'docx' ? 'DOCX export requires a Pandoc installation.' : 'HTML export produces a standalone styled file.'}
                </p>
              )}
            </div>

            {/* Include options */}
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 600 }}>
                Include
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <CheckRow checked={includeToc} onChange={setIncludeToc} label="Table of contents" />
                <CheckRow checked={includeFindingsTable} onChange={setIncludeFindingsTable} label="Finding severity table" />
                <CheckRow checked={includeCredentials} onChange={setIncludeCredentials} label="Credentials section" />
                {includeCredentials && (
                  <div style={{ marginLeft: 20 }}>
                    <CheckRow
                      checked={redactCredentials}
                      onChange={setRedactCredentials}
                      label="Redact passwords/hashes [redacted]"
                      accent={redactCredentials}
                    />
                  </div>
                )}
                <CheckRow checked={includeRawNmap} onChange={setIncludeRawNmap} label="Raw nmap output (appendix)" />
              </div>
            </div>
          </div>

          {/* Export progress bar + step message */}
          {exporting && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={exportStep}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    style={{ fontSize: 11, color: '#4a9eff', fontWeight: 600 }}
                  >
                    {exportStep}
                  </motion.span>
                </AnimatePresence>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(exportProgress)}%
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(42,51,71,0.4)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${exportProgress}%`,
                  background: 'linear-gradient(90deg, rgba(74,158,255,0.6) 0%, #4a9eff 60%, rgba(74,158,255,0.8) 100%)',
                  transition: 'width 0.08s linear',
                  boxShadow: '0 0 8px rgba(74,158,255,0.5)',
                }} />
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: exporting ? 'none' : '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-ghost" onClick={onCancel} disabled={exporting}>Cancel</button>
            <button className="btn-primary" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(74,158,255,0.3)', borderTopColor: '#4a9eff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  {exportStep || 'Exporting…'}
                </span>
              ) : `Export ${FORMAT_PILLS.find(f => f.id === format)?.label ?? format}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function RadioRow({ checked, onChange, label, detail }: {
  checked: boolean; onChange: () => void; label: string; detail: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
          background: checked ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s, background 0.15s',
        }}>
          {checked && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#000' }} />}
        </div>
      </div>
      <input type="radio" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: checked ? 600 : 400 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{detail}</div>
      </div>
    </label>
  );
}

function CheckRow({ checked, onChange, label, accent }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; accent?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 14, height: 14, borderRadius: 3,
          border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
          background: checked ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3L3.5 5.5L8 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <span style={{ fontSize: 13, color: accent ? 'var(--accent)' : 'var(--text-dim)' }}>{label}</span>
    </label>
  );
}
