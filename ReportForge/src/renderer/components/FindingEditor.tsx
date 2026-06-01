import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { makeBlankFinding, SEVERITIES } from '../lib/defaults';
import { SeverityBadge } from './SeverityBadge';
import type { Finding, Severity } from '@shared/types';

interface Props {
  findingId: string | null;
  onClose: () => void;
}

export default function FindingEditor({ findingId, onClose }: Props) {
  const { activeReport, upsertFinding } = useStore();
  const existing = activeReport?.findings.find(f => f.id === findingId) ?? null;

  const [form, setForm] = useState<Finding>(() => existing ?? makeBlankFinding());
  const [refInput, setRefInput] = useState('');

  useEffect(() => {
    setForm(existing ?? makeBlankFinding());
    setRefInput('');
  }, [findingId]);

  function patch(p: Partial<Finding>) {
    setForm(f => ({ ...f, ...p }));
  }

  function addRef() {
    const r = refInput.trim();
    if (r && !form.references.includes(r)) {
      patch({ references: [...form.references, r] });
    }
    setRefInput('');
  }

  function removeRef(ref: string) {
    patch({ references: form.references.filter(r => r !== ref) });
  }

  function handleSave() {
    if (!form.title.trim()) return;
    upsertFinding(form);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 10, width: 600, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{findingId ? 'Edit Finding' : 'New Finding'}</h3>
            <SeverityBadge severity={form.severity} />
          </div>
          <button className="btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <F label="Title *">
              <input value={form.title} onChange={e => patch({ title: e.target.value })} placeholder="Finding title" style={{ width: '100%' }} />
            </F>
            <F label="Severity">
              <select value={form.severity} onChange={e => patch({ severity: e.target.value as Severity })} style={{ width: 110 }}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
          </div>

          <F label="CVSS Score">
            <input value={form.cvss || ''} onChange={e => patch({ cvss: e.target.value })} placeholder='e.g. "7.5 (High)"' style={{ width: '100%' }} />
          </F>

          <F label="Description">
            <textarea value={form.description} onChange={e => patch({ description: e.target.value })} placeholder="What was found?" rows={3} style={{ width: '100%' }} />
          </F>

          <F label="Evidence">
            <textarea value={form.evidence} onChange={e => patch({ evidence: e.target.value })} placeholder="Proof — commands, screenshots, output…" rows={3} style={{ width: '100%' }} />
          </F>

          <F label="Impact">
            <textarea value={form.impact} onChange={e => patch({ impact: e.target.value })} placeholder="Business/security impact" rows={2} style={{ width: '100%' }} />
          </F>

          <F label="Recommendation">
            <textarea value={form.recommendation} onChange={e => patch({ recommendation: e.target.value })} placeholder="How to fix it" rows={2} style={{ width: '100%' }} />
          </F>

          <F label="References">
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={refInput}
                onChange={e => setRefInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRef()}
                placeholder="CVE-xxxx-xxxx or URL"
                style={{ flex: 1 }}
              />
              <button className="btn-ghost" style={{ padding: '5px 12px' }} onClick={addRef}>Add</button>
            </div>
            {form.references.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {form.references.map(r => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ flex: 1, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</span>
                    <button
                      onClick={() => removeRef(r)}
                      style={{ background: 'none', color: 'var(--text-muted)', padding: '0 4px', fontSize: 12, border: 'none' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </F>

          <F label="Linked ReconDesk Card ID">
            <input value={form.linkedCardId || ''} onChange={e => patch({ linkedCardId: e.target.value })} placeholder="Optional card reference" style={{ width: '100%' }} />
          </F>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!form.title.trim()} onClick={handleSave}>Save Finding</button>
        </div>
      </div>
    </motion.div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}
