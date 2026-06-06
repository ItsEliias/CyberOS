import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { makeReportFromTemplate, makeId } from '../lib/defaults';
import { StepTemplate, Step2Form, Step3Import, Step4Writeup, ReportCoverPreview } from './NewReportWizardParts';
import HelpTip from './ui/HelpTip';
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

  const STEP_HELP: Record<number, { title: string; body: string }> = {
    1: { title: 'Choose Template', body: 'Pick a starting structure (PTES, OWASP Web, HTB, blank, etc.). Sections seed in for you and stay fully editable.' },
    2: { title: 'Report Metadata', body: 'Set the title, target, platform, and operator. These propagate into the cover page and report variables.' },
    3: { title: 'ReconDesk Import', body: 'Pull a target from the shared ReconDesk app to auto-fill target name, IP, and any captured credentials. Optional — Skip to continue.' },
    4: { title: 'Writeup Import', body: 'Seed the Executive Summary from a GhostVault session, a CyberLab markdown writeup, or pasted markdown. Optional.' },
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>New Report</h2>
              <HelpTip
                title={STEP_HELP[step].title}
                body={STEP_HELP[step].body}
              />
            </div>
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

