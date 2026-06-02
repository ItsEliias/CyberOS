import type { ReportTemplate } from '@shared/types';
import { REPORT_TEMPLATES } from '../lib/defaults';

interface Props {
  id: ReportTemplate;
  selected: boolean;
  onSelect: (id: ReportTemplate) => void;
}

export default function TemplateCard({ id, selected, onSelect }: Props) {
  const def = REPORT_TEMPLATES.find(t => t.id === id)!;
  const count = def.sectionTitles.length;

  return (
    <button
      onClick={() => onSelect(id)}
      style={{
        display       : 'flex',
        flexDirection : 'column',
        gap           : 8,
        padding       : '14px 16px',
        background    : selected ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'var(--bg)',
        border        : `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius  : 8,
        cursor        : 'pointer',
        textAlign     : 'left',
        transition    : 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        boxShadow     : selected ? '0 0 0 1px var(--accent)' : 'none',
        minHeight     : 110,
      }}
      onMouseEnter={e => {
        if (!selected) {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
          (e.currentTarget as HTMLButtonElement).style.transform  = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLButtonElement).style.transform  = '';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text)' }}>
          {def.name}
        </span>
        <span style={{
          fontSize    : 10,
          fontWeight  : 600,
          padding     : '2px 7px',
          borderRadius: 99,
          background  : selected ? 'var(--accent)' : 'var(--border)',
          color       : selected ? '#000' : 'var(--text-muted)',
          whiteSpace  : 'nowrap',
        }}>
          {count} sections
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.45 }}>
        {def.description}
      </p>
    </button>
  );
}
