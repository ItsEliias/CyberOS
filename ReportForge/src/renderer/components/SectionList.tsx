import { useStore } from '../store';
import type { ReportSection } from '@shared/types';

interface Props {
  onSelectSection: (id: string) => void;
  activeView: 'sections' | 'findings';
  onViewChange: (v: 'sections' | 'findings') => void;
}

export default function SectionList({ onSelectSection, activeView, onViewChange }: Props) {
  const { activeReport, activeSectionId, updateSection, reorderSections, setActiveSectionId } = useStore();

  if (!activeReport) return null;

  const sorted = [...activeReport.sections].sort((a, b) => a.order - b.order);

  function handleClick(id: string) {
    setActiveSectionId(id);
    onSelectSection(id);
  }

  function toggleVisible(s: ReportSection, e: React.MouseEvent) {
    e.stopPropagation();
    updateSection(s.id, { visible: !s.visible });
  }

  function moveUp(s: ReportSection, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = sorted.findIndex(x => x.id === s.id);
    if (idx <= 0) return;
    const updated = sorted.map(x => ({ ...x }));
    const tmp = updated[idx].order;
    updated[idx].order = updated[idx - 1].order;
    updated[idx - 1].order = tmp;
    reorderSections(updated);
  }

  function moveDown(s: ReportSection, e: React.MouseEvent) {
    e.stopPropagation();
    const idx = sorted.findIndex(x => x.id === s.id);
    if (idx >= sorted.length - 1) return;
    const updated = sorted.map(x => ({ ...x }));
    const tmp = updated[idx].order;
    updated[idx].order = updated[idx + 1].order;
    updated[idx + 1].order = tmp;
    reorderSections(updated);
  }

  const findingsCount = activeReport.findings.length;

  return (
    <div style={{
      width: 200, flexShrink: 0, borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', background: 'var(--panel)'
    }}>
      {/* View tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['sections', 'findings'] as const).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              flex: 1, padding: '9px 0', fontSize: 11, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeView === v ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeView === v ? '2px solid var(--accent)' : '2px solid transparent',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              transition: 'color 0.15s'
            }}
          >
            {v === 'findings' ? `Findings${findingsCount ? ` (${findingsCount})` : ''}` : 'Sections'}
          </button>
        ))}
      </div>

      {/* Section list */}
      {activeView === 'sections' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {sorted.map((s, i) => (
            <div
              key={s.id}
              onClick={() => handleClick(s.id)}
              style={{
                padding: '7px 10px 7px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: activeSectionId === s.id ? 'rgba(63,185,80,0.08)' : 'transparent',
                borderLeft: activeSectionId === s.id ? '2px solid var(--accent)' : '2px solid transparent',
                opacity: s.visible ? 1 : 0.4,
                transition: 'background 0.1s, border-color 0.1s',
              }}
            >
              <span style={{ flex: 1, fontSize: 12, color: activeSectionId === s.id ? 'var(--text)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </span>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <IconBtn title={s.visible ? 'Hide' : 'Show'} onClick={e => toggleVisible(s, e)}>
                  {s.visible ? '●' : '○'}
                </IconBtn>
                <IconBtn title="Move up" onClick={e => moveUp(s, e)} disabled={i === 0}>↑</IconBtn>
                <IconBtn title="Move down" onClick={e => moveDown(s, e)} disabled={i === sorted.length - 1}>↓</IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled }: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none', border: 'none', padding: '1px 3px',
        fontSize: 10, color: 'var(--text-muted)', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {children}
    </button>
  );
}
