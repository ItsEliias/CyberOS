import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Session } from '@shared/types';

interface CollabExportProps {
  session: Session;
  onClose: () => void;
}

interface ImportResult {
  ok: boolean;
  error?: string;
  session?: Partial<Session>;
}

function buildExportPayload(session: Session): string {
  const payload = {
    version: '1',
    exportedAt: new Date().toISOString(),
    lab: session.labName,
    platform: session.platform,
    difficulty: session.difficulty,
    labType: session.labType,
    target: session.target,
    flags: session.findings.flags.map(f => ({ value: f.value, addedAt: f.addedAt })),
    findings: {
      ports: session.findings.ports.map(f => f.value),
      users: session.findings.users.map(f => f.value),
      credentials: session.findings.credentials.map(f => f.value),
      cves: session.findings.cves.map(f => f.value),
      hashes: session.findings.hashes.map(f => f.value),
    },
    notes: session.findings.notes,
    hintsUsed: session.hintsUsed,
    elapsed: session.timer?.elapsed ?? 0,
  };
  return JSON.stringify(payload, null, 2);
}

function parseImport(raw: string): ImportResult {
  try {
    const data = JSON.parse(raw);
    if (!data.lab) return { ok: false, error: 'Missing lab name in payload' };
    return { ok: true, session: data };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

export default function CollabExport({ session, onClose }: CollabExportProps) {
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const exportJson = buildExportPayload(session);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleImport() {
    const result = parseImport(importText.trim());
    setImportResult(result);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        className="panel w-[520px] max-w-[94vw] max-h-[85vh] flex flex-col"
        style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Share Session</span>
            <div className="flex gap-1">
              {(['export', 'import'] as const).map(m => (
                <button
                  key={m}
                  className="text-[10px] px-2.5 py-1 rounded capitalize"
                  style={{
                    background: mode === m ? 'var(--accent-dim)' : 'transparent',
                    color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                  onClick={() => setMode(m)}
                >
                  {m === 'export' ? 'Export' : 'Import'}
                </button>
              ))}
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18 }} onClick={onClose}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {mode === 'export' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Share this session state (flags, findings, notes) with others. Copy the JSON below.
              </p>
              <textarea
                readOnly
                value={exportJson}
                className="w-full font-mono text-[11px] resize-none"
                style={{ height: 300, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', color: 'var(--text-dim)', outline: 'none' }}
              />
              <button
                className="btn-accent w-full py-2 text-xs"
                style={{ background: copied ? '#3fb950' : undefined, borderColor: copied ? '#3fb950' : undefined }}
                onClick={handleCopy}
              >
                {copied ? 'Copied to Clipboard ✓' : 'Copy to Clipboard'}
              </button>
            </div>
          )}

          {mode === 'import' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Paste a session JSON from a teammate to view their findings.
              </p>
              <textarea
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportResult(null); }}
                placeholder="Paste session JSON here..."
                className="w-full font-mono text-[11px] resize-none"
                style={{ height: 200, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', color: 'var(--text-dim)', outline: 'none' }}
              />
              <button className="btn-accent w-full py-2 text-xs" onClick={handleImport} disabled={!importText.trim()}>
                Parse Session
              </button>
              {importResult && (
                <div className="p-3 rounded" style={{ background: importResult.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', border: `1px solid ${importResult.ok ? '#3fb950' : '#f85149'}` }}>
                  {importResult.ok && importResult.session ? (
                    <div className="space-y-1 text-xs">
                      <div style={{ color: '#3fb950' }}>Parsed successfully</div>
                      <div style={{ color: 'var(--text-dim)' }}>Lab: {String(importResult.session.lab || importResult.session.labName || '—')}</div>
                      <div style={{ color: 'var(--text-dim)' }}>Flags: {Array.isArray((importResult.session as Record<string, unknown>).flags) ? ((importResult.session as Record<string, unknown>).flags as unknown[]).length : '—'}</div>
                      <div style={{ color: 'var(--text-dim)' }}>Notes: {String((importResult.session as Record<string, unknown>).notes || '—').slice(0, 80)}</div>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: '#f85149' }}>Error: {importResult.error}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
