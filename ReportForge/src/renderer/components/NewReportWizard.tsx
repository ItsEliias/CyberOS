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

  useEffect(() => {
    if (step === 3) {
      window.reportforge.listReconTargets().then(t => setTargets(t || []));
    }
    if (step === 4) {
      window.reportforge.listWriteupFiles().then(w => setWriteups(w || []));
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
          borderRadius: 10, width: 560, maxHeight: '85vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>New Report</h2>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
              <div key={s} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: s <= step ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s'
              }} />
            ))}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
            Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepTemplate selected={selectedTemplate} onSelect={handleTemplateSelect} />
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
  const templates: ReportTemplate[] = ['blank', 'ptes', 'owasp-web', 'htb-machine'];
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

// ── Step 4: CyberLab Writeup Import ──────────────────────────────────────────
function Step4Writeup({ writeups, selected, onSelect, onImport, importing }: {
  writeups: WriteupFile[];
  selected: string;
  onSelect: (path: string) => void;
  onImport: () => void;
  importing: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
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
