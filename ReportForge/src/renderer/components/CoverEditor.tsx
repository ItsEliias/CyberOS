import { useState, useRef } from 'react';
import { useStore } from '../store';
import HelpTip from './ui/HelpTip';
import type { CoverData, ClassificationLabel, ReportSection } from '@shared/types';

const CLASSIFICATIONS: ClassificationLabel[] = ['Confidential', 'Internal', 'Public'];

const CLASS_COLORS: Record<ClassificationLabel, string> = {
  Confidential: '#ff4444',
  Internal    : '#f0a500',
  Public      : '#3fb950',
};

interface Props {
  section: ReportSection;
}

export default function CoverEditor({ section }: Props) {
  const { updateSection } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const data: CoverData = section.coverData ?? {
    title         : '',
    clientName    : '',
    testerName    : '',
    date          : new Date().toISOString().slice(0, 10),
    classification: 'Confidential',
    logoBase64    : undefined,
  };

  function patch(p: Partial<CoverData>) {
    updateSection(section.id, { coverData: { ...data, ...p } });
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { patch({ logoBase64: reader.result as string }); };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header with help */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Cover Page
        </span>
        <HelpTip
          title="Cover Page"
          body="The branded first page of the report. Set client, tester, date, classification, and optional logo — the preview updates live."
        />
      </div>

      {/* Preview */}
      <CoverPreview data={data} />

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Fields */}
      <CF label="Report Title">
        <input
          value={data.title}
          onChange={e => patch({ title: e.target.value })}
          placeholder="e.g. Web Application Penetration Test Report"
          style={{ width: '100%' }}
        />
      </CF>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <CF label="Client Name">
          <input value={data.clientName} onChange={e => patch({ clientName: e.target.value })} style={{ width: '100%' }} />
        </CF>
        <CF label="Tester Name">
          <input value={data.testerName} onChange={e => patch({ testerName: e.target.value })} style={{ width: '100%' }} />
        </CF>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <CF label="Date">
          <input type="date" value={data.date} onChange={e => patch({ date: e.target.value })} style={{ width: '100%' }} />
        </CF>
        <CF label="Classification">
          <select value={data.classification} onChange={e => patch({ classification: e.target.value as ClassificationLabel })} style={{ width: '100%' }}>
            {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </CF>
      </div>

      <CF label="Logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data.logoBase64 && (
            <img src={data.logoBase64} alt="logo" style={{ height: 36, maxWidth: 100, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)', padding: 4 }} />
          )}
          <button className="btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => fileRef.current?.click()}>
            {data.logoBase64 ? 'Change Logo' : 'Upload Logo'}
          </button>
          {data.logoBase64 && (
            <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={() => patch({ logoBase64: undefined })}>
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
      </CF>
    </div>
  );
}

function CoverPreview({ data }: { data: CoverData }) {
  const classColor = CLASS_COLORS[data.classification];
  return (
    <div style={{
      background: '#fff', borderRadius: 6, padding: '24px 28px', color: '#1a1a1a',
      border: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
      minHeight: 160,
    }}>
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#3fb950' }} />

      {/* Classification label */}
      <div style={{
        position: 'absolute', top: 10, right: 12,
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: classColor, border: `1px solid ${classColor}`, borderRadius: 3,
        padding: '2px 7px',
      }}>
        {data.classification}
      </div>

      {data.logoBase64 && (
        <img src={data.logoBase64} alt="" style={{ height: 28, marginBottom: 10, objectFit: 'contain' }} />
      )}

      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: '#111' }}>
        {data.title || <span style={{ color: '#aaa' }}>Report Title</span>}
      </div>

      <div style={{ fontSize: 11, color: '#555', display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 4 }}>
        {data.clientName && <span>Client: <strong>{data.clientName}</strong></span>}
        {data.testerName && <span>Prepared by: <strong>{data.testerName}</strong></span>}
        {data.date       && <span>Date: <strong>{data.date}</strong></span>}
      </div>
    </div>
  );
}

function CF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}
