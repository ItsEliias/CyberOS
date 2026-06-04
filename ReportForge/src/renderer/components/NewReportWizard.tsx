import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { makeReportFromTemplate, makeId, PLATFORMS } from '../lib/defaults';
import TemplateCard from './TemplateCard';
import type { Report, ReconDeskTarget, WriteupFile, ReportTemplate } from '@shared/types';

interface Props {
  onComplete: (r: Report) => void;
  onCancel: () => void;
}

const STEP_LABELS = ['Choose Template', 'Report Metadata', 'Import from ReconDesk', 'Import Writeup'];
const TOTAL_STEPS = 4;

export default function NewReportWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('blank');
  const [draft, setDraft] = useState<Report>(() => makeReportFromTemplate('blank'));

  // Step 3 state
  const [targets, setTargets] = useState<ReconDeskTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [importingTarget, setImportingTarget] = useState(false);

  // Step 4 state
  const [writeups, setWriteups] = useState<WriteupFile[]>([]);
  const [selectedWriteup, setSelectedWriteup] = useState<string>('');
  const [importingWriteup, setImportingWriteup] = useState(false);
  const [pasteMarkdown, setPasteMarkdown] = useState('');
  const [ghostExport, setGhostExport] = useState<{ sessionName: string; notes: string; exportedAt: string } | null>(null);
  const [importingGhost, setImportingGhost] = useState(false);

  useEffect(() => {
    if (step === 3) {
      window.reportforge.listReconTargets().then(t => setTargets(t || []));
    }
    if (step === 4) {
      window.reportforge.listWriteupFiles().then(w => setWriteups(w || []));
      window.reportforge.checkGhostVaultExport().then(exp => setGhostExport(exp));
    }
  }, [step]);

  // Rebuild draft when template changes (before metadata is filled)
  function handleTemplateSelect(t: ReportTemplate) {
    setSelectedTemplate(t);
    setDraft(makeReportFromTemplate(t));
  }

  function patch(p: Partial<Report>) {
    setDraft(d => ({ ...d, ...p }));
  }

  async function importFromRecon() {
    const t = targets.find(x => x.id === selectedTarget);
    if (!t) return;
    setImportingTarget(true);
    const updates: Partial<Report> = {
      targetName       : t.name || draft.targetName,
      targetIP         : (t.ip as string) || draft.targetIP,
      reconDeskTargetId: t.id,
    };
    if (t.credentials && Array.isArray(t.credentials) && t.credentials.length > 0) {
      const credLines = t.credentials.map((c: { username?: string; password?: string; service?: string }) =>
        `| ${c.username || '—'} | ${c.password || '—'} | ${c.service || '—'} |`
      );
      const credTable = `| Username | Password | Service |\n|---|---|---|\n${credLines.join('\n')}`;
      const sections = draft.sections.map(s =>
        s.title === 'Credentials Discovered' ? { ...s, content: credTable } : s
      );
      updates.sections = sections;
    }
    patch(updates);
    setImportingTarget(false);
  }

  async function importFromWriteup() {
    if (!selectedWriteup) return;
    setImportingWriteup(true);
    const content = await window.reportforge.readWriteupFile(selectedWriteup);
    if (content) {
      const sections = draft.sections.map(s =>
        s.title === 'Executive Summary' ? { ...s, content } : s
      );
      patch({ sections, cyberLabSessionId: makeId() });
    }
    setImportingWriteup(false);
  }

  function applyPastedMarkdown() {
    const content = pasteMarkdown.trim();
    if (!content) return;
    const sections = draft.sections.map(s =>
      s.title === 'Executive Summary' ? { ...s, content } : s
    );
    patch({ sections, cyberLabSessionId: makeId() });
    setPasteMarkdown('');
  }

  async function importFromGhostVault() {
    if (!ghostExport) return;
    setImportingGhost(true);
    // Append as a new section or append to Executive Summary
    const ghostSection = draft.sections.find(s => s.title === ghostExport.sessionName);
    let sections;
    if (ghostSection) {
      sections = draft.sections.map(s =>
        s.id === ghostSection.id ? { ...s, content: ghostExport.notes } : s
      );
    } else {
      const newSection = {
        id     : makeId(),
        title  : ghostExport.sessionName,
        content: ghostExport.notes,
        order  : draft.sections.length,
        visible: true,
      };
      sections = [...draft.sections, newSection];
    }
    patch({ sections });
    await window.reportforge.clearGhostVaultExport();
    setGhostExport(null);
    setImportingGhost(false);
  }

  const canNext2 = draft.title.trim() && draft.targetName.trim() && draft.operator.trim();

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, width: step === 1 ? 780 : 560, maxHeight: '85vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.35s cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>New Report</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {step} / {TOTAL_STEPS}
            </span>
          </div>

          {/* Animated progress bar */}
          <div style={{ height: 4, background: 'rgba(42,51,71,0.5)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              height: '100%',
              width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
              background: 'linear-gradient(90deg, rgba(74,158,255,0.7) 0%, #4a9eff 100%)',
              borderRadius: 99,
              transition: 'width 0.4s cubic-bezier(0.2,0.8,0.2,1)',
              boxShadow: '0 0 8px rgba(74,158,255,0.4)',
            }} />
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => {
              const done = s < step;
              const active = s === step;
              return (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
                  <div style={{
                    width: active ? 20 : 8, height: 8, borderRadius: 99,
                    background: done ? '#4a9eff' : active ? '#4a9eff' : 'rgba(42,51,71,0.6)',
                    transition: 'all 0.3s cubic-bezier(0.2,0.8,0.2,1)',
                    boxShadow: active ? '0 0 6px rgba(74,158,255,0.5)' : 'none',
                  }} />
                  <span style={{
                    fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.03em',
                    color: active ? '#4a9eff' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                    transition: 'color 0.2s',
                    whiteSpace: 'nowrap',
                  }}>
                    {STEP_LABELS[s - 1].split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', gap: 20 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <StepTemplate selected={selectedTemplate} onSelect={handleTemplateSelect} />
                </div>
                <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: 0 }}>Preview</p>
                  <ReportCoverPreview template={selectedTemplate} title={draft.title || 'Untitled Report'} />
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Step2Form draft={draft} onChange={patch} />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Step3Import
                  targets={targets}
                  selected={selectedTarget}
                  onSelect={setSelectedTarget}
                  onImport={importFromRecon}
                  importing={importingTarget}
                  draft={draft}
                />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Step4Writeup
                  writeups={writeups}
                  selected={selectedWriteup}
                  onSelect={setSelectedWriteup}
                  onImport={importFromWriteup}
                  importing={importingWriteup}
                  pasteMarkdown={pasteMarkdown}
                  onPasteChange={setPasteMarkdown}
                  onApplyPaste={applyPastedMarkdown}
                  ghostExport={ghostExport}
                  onImportGhost={importFromGhostVault}
                  importingGhost={importingGhost}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between'
        }}>
          <button className="btn-ghost" onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && step < TOTAL_STEPS && (
              <button className="btn-ghost" onClick={() => setStep(s => s + 1)} style={{ color: 'var(--text-muted)' }}>
                Skip
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                className="btn-primary"
                disabled={step === 2 && !canNext2}
                onClick={() => setStep(s => s + 1)}
              >
                Next
              </button>
            ) : (
              <button className="btn-primary" onClick={() => onComplete(draft)}>
                Create Report
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Step 1: Template Selection ────────────────────────────────────────────────
function StepTemplate({ selected, onSelect }: {
  selected: ReportTemplate;
  onSelect: (t: ReportTemplate) => void;
}) {
  const templates: ReportTemplate[] = [
    'blank', 'ptes', 'owasp-web', 'htb-machine',
    'network-pentest', 'active-directory', 'api-security',
    'mobile-app', 'executive-summary',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
        Choose a starting structure for your report. You can customise sections after creation.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {templates.map(t => (
          <TemplateCard key={t} id={t} selected={selected === t} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Metadata ──────────────────────────────────────────────────────────
function Step2Form({ draft, onChange }: { draft: Report; onChange: (p: Partial<Report>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Report Title *">
        <input value={draft.title} onChange={e => onChange({ title: e.target.value })} placeholder="e.g. TryHackMe — Blue" style={{ width: '100%' }} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Target Name *">
          <input value={draft.targetName} onChange={e => onChange({ targetName: e.target.value })} placeholder="e.g. Blue" style={{ width: '100%' }} />
        </Field>
        <Field label="Target IP">
          <input value={draft.targetIP} onChange={e => onChange({ targetIP: e.target.value })} placeholder="10.10.x.x" style={{ width: '100%' }} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Platform">
          <select value={draft.platform} onChange={e => onChange({ platform: e.target.value })} style={{ width: '100%' }}>
            {PLATFORMS.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Assessment Date">
          <input type="date" value={draft.assessmentDate} onChange={e => onChange({ assessmentDate: e.target.value })} style={{ width: '100%' }} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Operator *">
          <input value={draft.operator} onChange={e => onChange({ operator: e.target.value })} placeholder="Your name" style={{ width: '100%' }} />
        </Field>
        <Field label="Difficulty">
          <input value={draft.difficulty || ''} onChange={e => onChange({ difficulty: e.target.value })} placeholder="Easy / Medium / Hard" style={{ width: '100%' }} />
        </Field>
      </div>
    </div>
  );
}

// ── Step 3: ReconDesk Import ──────────────────────────────────────────────────
function Step3Import({ targets, selected, onSelect, onImport, importing, draft }: {
  targets: ReconDeskTarget[];
  selected: string;
  onSelect: (id: string) => void;
  onImport: () => void;
  importing: boolean;
  draft: Report;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
        Optionally pull target data from ReconDesk. This auto-populates target name, IP, and credentials.
      </p>
      {targets.length === 0 ? (
        <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
          No ReconDesk targets found in ecosystem config.
        </div>
      ) : (
        <>
          <select value={selected} onChange={e => onSelect(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Select a target —</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.ip ? `(${t.ip})` : ''}</option>
            ))}
          </select>
          <button className="btn-primary" disabled={!selected || importing} onClick={onImport} style={{ alignSelf: 'flex-start' }}>
            {importing ? 'Importing…' : 'Import from ReconDesk'}
          </button>
        </>
      )}
      {(draft.targetName || draft.targetIP) && (
        <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6, fontSize: 12, color: 'var(--text-dim)' }}>
          Target: <strong style={{ color: 'var(--text)' }}>{draft.targetName}</strong>
          {draft.targetIP && <> · <span style={{ color: 'var(--accent)' }}>{draft.targetIP}</span></>}
        </div>
      )}
    </div>
  );
}

// ── Step 4: Writeup Import ────────────────────────────────────────────────────
function Step4Writeup({ writeups, selected, onSelect, onImport, importing, pasteMarkdown, onPasteChange, onApplyPaste, ghostExport, onImportGhost, importingGhost }: {
  writeups: WriteupFile[];
  selected: string;
  onSelect: (path: string) => void;
  onImport: () => void;
  importing: boolean;
  pasteMarkdown: string;
  onPasteChange: (v: string) => void;
  onApplyPaste: () => void;
  ghostExport: { sessionName: string; notes: string; exportedAt: string } | null;
  onImportGhost: () => void;
  importingGhost: boolean;
}) {
  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* GhostVault import */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Import from GhostVault
        </p>
        {ghostExport ? (
          <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                GhostVault session: {ghostExport.sessionName}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                exported {timeAgo(ghostExport.exportedAt)}
              </span>
            </div>
            <button className="btn-primary" disabled={importingGhost} onClick={onImportGhost}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {importingGhost ? 'Importing…' : 'Import Notes'}
            </button>
          </div>
        ) : (
          <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            No GhostVault export staged. Use the "Export to Report" button in GhostVault.
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* CyberLab vault writeup */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Import from CyberLab Vault
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
          Optionally import a writeup from your CyberLab Obsidian vault as a starting point for the Executive Summary.
        </p>
        {writeups.length === 0 ? (
          <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            No writeup files found. Check your CyberLab Obsidian vault path in the ecosystem config.
          </div>
        ) : (
          <>
            <select value={selected} onChange={e => onSelect(e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select a writeup —</option>
              {writeups.map(w => (
                <option key={w.path} value={w.path}>{w.name}</option>
              ))}
            </select>
            <button className="btn-primary" disabled={!selected || importing} onClick={onImport} style={{ alignSelf: 'flex-start' }}>
              {importing ? 'Importing…' : 'Import Writeup'}
            </button>
          </>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Paste markdown directly */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Or paste Markdown directly
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
          Paste a writeup or notes directly to populate the Executive Summary.
        </p>
        <textarea
          value={pasteMarkdown}
          onChange={e => onPasteChange(e.target.value)}
          placeholder="Paste Markdown content here…"
          rows={6}
          style={{ width: '100%', fontFamily: '"SF Mono", "Fira Code", Consolas, monospace', fontSize: 12, lineHeight: 1.6 }}
        />
        <button
          className="btn-primary"
          disabled={!pasteMarkdown.trim()}
          onClick={onApplyPaste}
          style={{ alignSelf: 'flex-start' }}
        >
          Apply to Executive Summary
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

// ── Mock Report Cover Preview ─────────────────────────────────────────────────
function ReportCoverPreview({ template, title }: { template: ReportTemplate; title: string }) {
  const typeMap: Record<string, string> = {
    blank: 'General', ptes: 'Pentest', 'owasp-web': 'Web Audit',
    'htb-machine': 'HTB Write-up', 'network-pentest': 'Network',
    'active-directory': 'Red Team', 'api-security': 'API Audit',
    'mobile-app': 'Mobile', 'executive-summary': 'Executive',
  };
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <div style={{
      background: 'linear-gradient(160deg, #0d0e18 0%, #0a0c16 100%)',
      border: '1px solid rgba(74,158,255,0.25)',
      borderRadius: 8,
      padding: '14px 12px',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,158,255,0.06)',
      minHeight: 240,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        background: 'radial-gradient(circle, rgba(74,158,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* CYBERTOOLS logo mock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(74,158,255,0.2)', border: '1px solid rgba(74,158,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4a9eff' }} />
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#4a9eff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CYBERTOOLS</span>
      </div>
      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(74,158,255,0.15)' }} />
      {/* Report type */}
      <span style={{
        fontSize: 8, fontWeight: 700, color: '#4a9eff', textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {typeMap[template] ?? 'General'} Report
      </span>
      {/* Title */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#e6edf3', lineHeight: 1.4, wordBreak: 'break-word' }}>
        {title || 'Untitled Report'}
      </div>
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(74,158,255,0.10)' }} />
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Confidential</span>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{today}</span>
      </div>
    </div>
  );
}
