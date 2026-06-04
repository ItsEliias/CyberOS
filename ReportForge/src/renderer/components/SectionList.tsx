import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { useStore } from '../store';
import type { ReportSection, SectionType } from '@shared/types';
import { makeId } from '../lib/defaults';
import { unresolvedCount } from './CommentsPanel';

interface Props {
  onSelectSection: (id: string) => void;
  activeView: 'sections' | 'findings';
  onViewChange: (v: 'sections' | 'findings') => void;
}

export default function SectionList({ onSelectSection, activeView, onViewChange }: Props) {
  const {
    activeReport, activeSectionId,
    updateSection, reorderSections, setActiveSectionId,
    patchReportMeta,
  } = useStore();
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  if (!activeReport) return null;

  const sorted = [...activeReport.sections].sort((a, b) => a.order - b.order);
  const findingsCount = activeReport.findings.length;

  function handleClick(id: string) {
    setActiveSectionId(id);
    onSelectSection(id);
  }

  function toggleVisible(s: ReportSection, e: React.MouseEvent) {
    e.stopPropagation();
    updateSection(s.id, { visible: !s.visible });
  }

  function handleReorder(reordered: ReportSection[]) {
    const updated = reordered.map((s, i) => ({ ...s, order: i }));
    reorderSections(updated);
  }

  function addSection(type: SectionType = 'body') {
    const title = type === 'body'
      ? newSectionTitle.trim()
      : type === 'cover'     ? 'Cover Page'
      : type === 'signature' ? 'Signature'
      : type === 'risk-matrix' ? 'Risk Matrix'
      : newSectionTitle.trim();
    if (!title) return;
    const newSection: ReportSection = {
      id     : makeId(),
      title,
      content: '',
      order  : activeReport!.sections.length,
      visible: true,
      type,
      comments: [],
    };
    const sections = [...activeReport!.sections, newSection];
    patchReportMeta({ sections } as never);
    setNewSectionTitle('');
    setAddingSection(false);
    setActiveSectionId(newSection.id);
    onSelectSection(newSection.id);
  }

  return (
    <div style={{
      width: 210, flexShrink: 0, borderRight: '1px solid var(--border)',
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
              transition: 'color 0.15s',
            }}
          >
            {v === 'findings' ? `Findings${findingsCount ? ` (${findingsCount})` : ''}` : 'Sections'}
          </button>
        ))}
      </div>

      {/* Section list with drag-to-reorder */}
      {activeView === 'sections' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Reorder.Group
              axis="y"
              values={sorted}
              onReorder={handleReorder}
              style={{ listStyle: 'none', padding: '4px 0', margin: 0 }}
            >
              {sorted.map((s) => (
                <SectionItem
                  key={s.id}
                  section={s}
                  isActive={activeSectionId === s.id}
                  onClick={() => handleClick(s.id)}
                  onToggleVisible={(e) => toggleVisible(s, e)}
                />
              ))}
            </Reorder.Group>
          </div>

          {/* Add section */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {addingSection ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  autoFocus
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addSection();
                    if (e.key === 'Escape') { setAddingSection(false); setNewSectionTitle(''); }
                  }}
                  placeholder="Section title"
                  style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                />
                <button
                  className="btn-primary"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => addSection('body')}
                  disabled={!newSectionTitle.trim()}
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                style={{
                  width: '100%', background: 'none', border: '1px dashed var(--border)',
                  color: 'var(--text-muted)', borderRadius: 4, padding: '5px 0',
                  fontSize: 11, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                + Add Section
              </button>
            )}
            {/* Special section type shortcuts */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(!activeReport!.sections.some(s => s.type === 'cover')) && (
                <SpecialBtn onClick={() => addSection('cover')} label="Cover" />
              )}
              {(!activeReport!.sections.some(s => s.type === 'signature')) && (
                <SpecialBtn onClick={() => addSection('signature')} label="Sig" title="Signature Block" />
              )}
              {(!activeReport!.sections.some(s => s.type === 'risk-matrix')) && (
                <SpecialBtn onClick={() => addSection('risk-matrix')} label="Matrix" title="Risk Matrix" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Special section type button ───────────────────────────────────────────────

function SpecialBtn({ onClick, label, title }: { onClick: () => void; label: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      style={{
        background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.25)',
        borderRadius: 3, padding: '2px 7px', fontSize: 10, color: 'var(--accent)',
        cursor: 'pointer', fontWeight: 600,
      }}
    >
      + {label}
    </button>
  );
}

// ── Draggable section item ────────────────────────────────────────────────────

interface SectionItemProps {
  section: ReportSection;
  isActive: boolean;
  onClick: () => void;
  onToggleVisible: (e: React.MouseEvent) => void;
}

function SectionItem({ section, isActive, onClick, onToggleVisible }: SectionItemProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: 'none' }}
    >
      <div
        onClick={onClick}
        style={{
          padding: '7px 8px 7px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: isActive ? 'rgba(63,185,80,0.08)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          opacity: section.visible ? 1 : 0.45,
          transition: 'background 0.1s, border-color 0.1s',
        }}
      >
        {/* Drag handle */}
        <span
          onPointerDown={e => { e.stopPropagation(); controls.start(e); }}
          style={{
            cursor: 'grab', fontSize: 11, color: 'var(--text-muted)',
            flexShrink: 0, padding: '0 2px', lineHeight: 1,
            userSelect: 'none', touchAction: 'none',
          }}
          title="Drag to reorder"
        >
          ⠿
        </span>

        {/* Type indicator */}
        {section.type && section.type !== 'body' && (
          <span style={{ fontSize: 9, color: 'var(--accent)', flexShrink: 0, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {section.type === 'toc' ? 'TOC' : section.type === 'cover' ? 'CVR' : section.type === 'signature' ? 'SIG' : section.type === 'risk-matrix' ? 'RMX' : ''}
          </span>
        )}

        {/* Title */}
        <span style={{
          flex: 1, fontSize: 12,
          color: isActive ? 'var(--text)' : 'var(--text-dim)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {section.title}
        </span>

        {/* Unresolved comments badge */}
        {unresolvedCount(section) > 0 && (
          <span style={{
            background: 'var(--accent)', color: '#000',
            borderRadius: 99, fontSize: 8, fontWeight: 700,
            padding: '1px 5px', flexShrink: 0, lineHeight: 1.4,
          }}>
            {unresolvedCount(section)}
          </span>
        )}

        {/* Visibility toggle */}
        <button
          title={section.visible ? 'Hide from export' : 'Show in export'}
          onClick={onToggleVisible}
          style={{
            background: 'none', border: 'none', padding: '1px 3px',
            fontSize: 10, color: section.visible ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer', flexShrink: 0, lineHeight: 1,
          }}
        >
          {section.visible ? '●' : '○'}
        </button>
      </div>
    </Reorder.Item>
  );
}
