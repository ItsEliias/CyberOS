import { useState } from 'react';
import { Reorder, useDragControls, motion } from 'framer-motion';
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
    <motion.div
      initial={{ x: -18, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        width: 210, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--panel)'
      }}>
      {/* View tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, padding: '6px 8px 0', gap: 2 }}>
        {(['sections', 'findings'] as const).map(v => {
          const isActive = activeView === v;
          return (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              style={{
                flex: 1, padding: '6px 4px 8px', fontSize: 11, fontWeight: 600,
                background: 'none', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
                color: isActive ? '#4a9eff' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid #4a9eff' : '2px solid transparent',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                transition: 'color 0.15s, background 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            >
              {v === 'findings' ? (
                <span>
                  Findings
                  {findingsCount > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 14, height: 14, borderRadius: 99, fontSize: 8, fontWeight: 700,
                      background: isActive ? 'rgba(74,158,255,0.2)' : 'rgba(42,51,71,0.6)',
                      color: isActive ? '#4a9eff' : 'var(--text-muted)',
                      marginLeft: 4, verticalAlign: 'middle',
                      transition: 'all 0.15s',
                    }}>
                      {findingsCount}
                    </span>
                  )}
                </span>
              ) : 'Sections'}
            </button>
          );
        })}
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
    </motion.div>
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
  const [hovered, setHovered] = useState(false);

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: 'none' }}
    >
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '7px 8px 7px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: isActive ? 'rgba(74,158,255,0.07)' : hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
          borderLeft: isActive ? '2px solid #4a9eff' : '2px solid transparent',
          opacity: section.visible ? 1 : 0.4,
          transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
        }}
      >
        {/* Drag handle — visible on row hover */}
        <span
          onPointerDown={e => { e.stopPropagation(); controls.start(e); }}
          title="Drag to reorder"
          style={{
            cursor: 'grab', fontSize: 11,
            color: hovered ? '#4a9eff' : 'transparent',
            flexShrink: 0, padding: '0 2px', lineHeight: 1,
            userSelect: 'none', touchAction: 'none',
            transition: 'color 0.15s, opacity 0.15s',
            opacity: hovered ? 0.85 : 0,
          }}
        >
          ⠿
        </span>

        {/* Type indicator */}
        {section.type && section.type !== 'body' && (
          <span style={{
            fontSize: 9, color: '#4a9eff', flexShrink: 0, fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            background: 'rgba(74,158,255,0.1)', borderRadius: 3,
            padding: '1px 4px', lineHeight: 1.4,
          }}>
            {section.type === 'toc' ? 'TOC' : section.type === 'cover' ? 'CVR' : section.type === 'signature' ? 'SIG' : section.type === 'risk-matrix' ? 'RMX' : ''}
          </span>
        )}

        {/* Title */}
        <span style={{
          flex: 1, fontSize: 12,
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: isActive ? 600 : 400,
          transition: 'color 0.15s, font-weight 0.15s',
        }}>
          {section.title}
        </span>

        {/* Reading time badge */}
        {section.content && section.content.trim().length > 0 && (() => {
          const words = section.content.trim().split(/\s+/).length;
          const mins = Math.max(1, Math.round(words / 200));
          return (
            <span style={{
              fontSize: 9, color: 'var(--text-muted)', flexShrink: 0,
              whiteSpace: 'nowrap', opacity: 0.7,
            }}>
              ~{mins}m
            </span>
          );
        })()}

        {/* Unresolved comments badge */}
        {unresolvedCount(section) > 0 && (
          <span style={{
            background: '#4a9eff', color: '#07080f',
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
            fontSize: 10, color: section.visible ? '#4a9eff' : 'var(--text-muted)',
            cursor: 'pointer', flexShrink: 0, lineHeight: 1,
            opacity: section.visible ? 0.8 : 0.4,
            transition: 'color 0.15s, opacity 0.15s',
          }}
        >
          {section.visible ? '●' : '○'}
        </button>
      </div>
    </Reorder.Item>
  );
}
