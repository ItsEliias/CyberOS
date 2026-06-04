import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { makeBlankFinding } from '../lib/defaults';
import type { Finding, Severity } from '@shared/types';

interface Props {
  onClose: () => void;
}

// Map CVSS score to severity
function cvssToSeverity(cvss: string | number | undefined): Severity {
  const n = parseFloat(String(cvss ?? '0'));
  if (n >= 9.0) return 'critical';
  if (n >= 7.0) return 'high';
  if (n >= 4.0) return 'medium';
  if (n >= 0.1) return 'low';
  return 'info';
}

interface RawFinding {
  id: string;
  title: string;
  cvss?: string | number;
  description?: string;
  severity?: string;
}

export default function ImportFindingsModal({ onClose }: Props) {
  const { upsertFinding } = useStore();
  const [raw, setRaw] = useState<RawFinding[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    window.reportforge.listReconTargets().then(targets => {
      // Flatten all "findings" out of target objects
      const findings: RawFinding[] = [];
      targets.forEach(t => {
        const tFindings = (t as Record<string, unknown>).findings as RawFinding[] | undefined;
        if (Array.isArray(tFindings)) findings.push(...tFindings);
      });
      if (findings.length === 0) {
        setError('No findings found in ReconDesk. Open ReconDesk and add findings to targets.');
      }
      setRaw(findings);
      setSelected(new Set(findings.map(f => f.id)));
      setLoading(false);
    }).catch(err => {
      setError(String(err));
      setLoading(false);
    });
  }, []);

  function toggleSelect(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function importSelected() {
    raw
      .filter(rf => selected.has(rf.id))
      .forEach(rf => {
        const severity: Severity = rf.severity as Severity ??
          cvssToSeverity(rf.cvss);
        const f: Finding = makeBlankFinding({
          title      : rf.title,
          severity,
          description: rf.description ?? '',
          cvss       : rf.cvss != null ? String(rf.cvss) : undefined,
        });
        upsertFinding(f);
      });
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Import Findings from ReconDesk</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Select findings to import. CVSS scores map to severity.</p>
          </div>
          <button className="btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>{error}</div>
          ) : raw.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No findings available in ReconDesk targets.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
                <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setSelected(new Set(raw.map(f => f.id)))}>Select All</button>
                <button className="btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setSelected(new Set())}>Deselect All</button>
              </div>
              {raw.map(rf => {
                const severity = rf.severity as Severity ?? cvssToSeverity(rf.cvss);
                return (
                  <label key={rf.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', background: selected.has(rf.id) ? 'rgba(63,185,80,0.06)' : 'var(--bg)' }}>
                    <input type="checkbox" checked={selected.has(rf.id)} onChange={() => toggleSelect(rf.id)} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {rf.title}
                        <span className={`badge badge-${severity}`} style={{ fontSize: 10 }}>{severity}</span>
                      </div>
                      {rf.cvss && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>CVSS: {rf.cvss}</div>}
                      {rf.description && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rf.description}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={selected.size === 0} onClick={importSelected}>
              Import {selected.size > 0 ? `${selected.size} Finding${selected.size !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
