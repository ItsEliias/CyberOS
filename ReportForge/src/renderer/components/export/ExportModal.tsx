import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ExportOptions {
  format: 'markdown' | 'pdf';
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
  defaultFormat?: 'markdown' | 'pdf';
}

export default function ExportModal({ onExport, onCancel, exporting, defaultFormat = 'markdown' }: Props) {
  const [format, setFormat] = useState<'markdown' | 'pdf'>(defaultFormat);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeFindingsTable, setIncludeFindingsTable] = useState(true);
  const [includeCredentials, setIncludeCredentials] = useState(true);
  const [redactCredentials, setRedactCredentials] = useState(true);
  const [includeRawNmap, setIncludeRawNmap] = useState(false);

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
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Export Report</h3>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Format */}
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 600 }}>
                Format
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RadioRow
                  checked={format === 'markdown'}
                  onChange={() => setFormat('markdown')}
                  label="Markdown (.md)"
                  detail="Single .md file, assembles all visible sections"
                />
                <RadioRow
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  label="PDF (.pdf)"
                  detail="Print-optimised via Electron printToPDF"
                />
              </div>
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

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-ghost" onClick={onCancel} disabled={exporting}>Cancel</button>
            <button className="btn-primary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : `Export ${format === 'markdown' ? 'Markdown' : 'PDF'}`}
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
