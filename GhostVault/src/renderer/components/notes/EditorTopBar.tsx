// GhostVault — EditorTopBar: the full toolbar row for EditorView

import type { EditorMode, NoteFile } from '@shared/types';
import { ToolBtn, ToolDivider, formatRelTime, tagHue } from './EditorToolbar';

function modeLabel(m: EditorMode): string {
  return m === 'edit' ? 'Edit' : m === 'split' ? 'Split' : 'Preview';
}

const MODES: EditorMode[] = ['edit', 'split', 'preview'];

interface Props {
  activeNote    : NoteFile | null;
  editorContent : string;
  editorMode    : EditorMode;
  dirty         : boolean;
  isPinned      : boolean;
  isLocked      : boolean;
  alwaysOnTop   : boolean;
  showHistory   : boolean;
  focusMode     : boolean;
  onSave        : () => void;
  onAiMenu      : () => void;
  onTemplate    : () => void;
  onTogglePin   : () => void;
  onToggleAot   : () => void;
  onCapture     : () => void;
  onInsertLink  : () => void;
  onInsertTable : () => void;
  onWrapSelection: (before: string, after: string) => void;
  onSetMode     : (m: EditorMode) => void;
  onToggleHistory: () => void;
  onToggleFocus : () => void;
  onPresentMode : () => void;
  onExportReport: () => void;
}

export default function EditorTopBar({
  activeNote, editorContent, editorMode, dirty, isPinned, isLocked, alwaysOnTop,
  showHistory, focusMode,
  onSave, onAiMenu, onTemplate, onTogglePin, onToggleAot, onCapture,
  onInsertLink, onInsertTable, onWrapSelection,
  onSetMode, onToggleHistory, onToggleFocus, onPresentMode, onExportReport,
}: Props) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
      style={{
        borderBottom: '1px solid rgba(42,51,71,0.4)',
        background: 'rgba(10,11,20,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Note title */}
      <div className="flex-1 min-w-0">
        {activeNote ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-mono" style={{ color: 'rgba(72,79,88,0.7)' }}>
                {activeNote.folder}/
              </span>
              <span className="text-sm font-semibold truncate" style={{ color: '#e6edf3', fontFamily: 'var(--font-display)' }}>
                {activeNote.name}
              </span>
              {isLocked && <span className="text-[10px]" style={{ color: '#d29922' }}>locked</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono tabular-nums" style={{ color: 'rgba(72,79,88,0.5)' }}>
                modified {formatRelTime(activeNote.mtime)}
              </span>
              {(activeNote.tags?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  {activeNote.tags!.slice(0, 3).map(tag => (
                    <span key={tag} className={`text-[9px] px-1.5 py-px rounded-full font-medium tag-colored tag-hue-${tagHue(tag)}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm font-semibold" style={{ color: 'rgba(72,79,88,0.7)', fontFamily: 'var(--font-display)' }}>
            GhostVault
          </span>
        )}
      </div>

      {/* Mode pills */}
      <div className="flex rounded overflow-hidden" style={{ border: '1px solid rgba(42,51,71,0.5)' }}>
        {MODES.map(m => (
          <button key={m}
            onClick={() => onSetMode(m)}
            className="px-2.5 py-1 text-[10px] font-medium transition-colors"
            style={{
              background: editorMode === m ? 'rgba(123,184,255,0.12)' : 'transparent',
              color: editorMode === m ? '#7bb8ff' : 'rgba(72,79,88,0.7)',
              borderRight: m !== 'preview' ? '1px solid rgba(42,51,71,0.4)' : 'none',
              fontFamily: 'var(--font-display)',
            }}>
            {modeLabel(m)}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        <ToolBtn onClick={() => onWrapSelection('**', '**')} title="Bold (⌘B)">
          <span style={{ fontWeight: 700, fontFamily: 'serif', fontSize: '0.85rem' }}>B</span>
        </ToolBtn>
        <ToolBtn onClick={() => onWrapSelection('_', '_')} title="Italic (⌘I)">
          <span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: '0.85rem' }}>I</span>
        </ToolBtn>
        <ToolBtn onClick={() => onWrapSelection('`', '`')} title="Inline Code">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>&lt;/&gt;</span>
        </ToolBtn>
        <ToolBtn onClick={onInsertLink} title="Insert Link">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </ToolBtn>
        <ToolDivider />
        <ToolBtn onClick={onInsertTable} title="Insert Table">⊞</ToolBtn>
        <ToolBtn onClick={onTemplate} title="Insert Template">🗂</ToolBtn>
        <ToolDivider />
        <ToolBtn onClick={onAiMenu} title="AI Assistant">✨</ToolBtn>
        <ToolBtn onClick={onCapture} title="Capture Window">⚡</ToolBtn>
        <ToolDivider />
        <ToolBtn onClick={onTogglePin} title={isPinned ? 'Unpin Note' : 'Pin Note'} active={isPinned}>📌</ToolBtn>
        <ToolBtn onClick={onToggleAot} title="Toggle Always on Top" active={alwaysOnTop}>⬆</ToolBtn>
        {activeNote && (
          <ToolBtn onClick={onToggleHistory} title="Version History" active={showHistory}>⏱</ToolBtn>
        )}
        <ToolDivider />
        <ToolBtn onClick={onToggleFocus} title="Focus Mode (⌘⇧F)" active={focusMode}>
          {focusMode ? '⊡' : '⊞'}
        </ToolBtn>
        <ToolBtn onClick={onPresentMode} title="Presentation Mode (F5)" disabled={!activeNote}>▶</ToolBtn>

        <button onClick={onSave} disabled={!dirty}
          className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all ml-1"
          style={{
            background: dirty ? 'rgba(123,184,255,0.15)' : 'rgba(42,51,71,0.15)',
            color: dirty ? '#7bb8ff' : 'rgba(72,79,88,0.6)',
            border: dirty ? '1px solid rgba(123,184,255,0.3)' : '1px solid rgba(42,51,71,0.3)',
            fontFamily: 'var(--font-display)',
          }}>
          {dirty ? 'Save' : 'Saved'}
        </button>

        {activeNote && editorContent.trim() && (
          <button onClick={onExportReport} title="Export to ReportForge"
            className="px-2.5 py-1 rounded text-[10px] font-medium transition-colors ml-0.5"
            style={{ border: '1px solid rgba(123,184,255,0.2)', color: '#7bb8ff', background: 'transparent', fontFamily: 'var(--font-display)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            → Report
          </button>
        )}
      </div>
    </div>
  );
}
