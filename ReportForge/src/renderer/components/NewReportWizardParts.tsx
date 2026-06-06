// NewReportWizardParts — extracted step components for NewReportWizard

import TemplateCard from './TemplateCard';
import HelpTip from './ui/HelpTip';
import { PLATFORMS } from '../lib/defaults';
import type { Report, ReconDeskTarget, WriteupFile, ReportTemplate } from '@shared/types';

// ── Field wrapper ─────────────────────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

// ── Step 1: Template Selection ────────────────────────────────────────────────

export function StepTemplate({ selected, onSelect }: {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
          Choose a starting structure for your report. You can customise sections after creation.
        </p>
        <HelpTip
          title="Templates"
          body="Each template seeds a different section layout (PTES, OWASP web, HTB write-up, etc.). Pick the closest match — you can add, remove, and rename sections after."
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {templates.map(t => (
          <TemplateCard key={t} id={t} selected={selected === t} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Metadata ──────────────────────────────────────────────────────────

export function Step2Form({ draft, onChange }: { draft: Report; onChange: (p: Partial<Report>) => void }) {
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

export function Step3Import({ targets, selected, onSelect, onImport, importing, draft }: {
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

export function Step4Writeup({ writeups, selected, onSelect, onImport, importing, pasteMarkdown, onPasteChange, onApplyPaste, ghostExport, onImportGhost, importingGhost }: {
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

// ── Mock Report Cover Preview ─────────────────────────────────────────────────

export function ReportCoverPreview({ template, title }: { template: ReportTemplate; title: string }) {
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
