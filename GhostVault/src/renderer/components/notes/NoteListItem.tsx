import { useState } from 'react';
import { motion } from 'framer-motion';
import type { NoteFile } from '@shared/types';

interface DragHandlers {
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

interface Props {
  note: NoteFile;
  isActive: boolean;
  isSelected: boolean;
  isPinned: boolean;
  isDragOver: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onPin: () => void;
  onExportMd: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  dragHandlers: DragHandlers;
  index: number;
}

function formatDate(mtime: number): string {
  const d = new Date(mtime);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NoteListItem({
  note, isActive, isSelected, isPinned, isDragOver,
  onClick, onDelete, onRename, onPin,
  onExportMd, onExportHtml, onExportPdf,
  dragHandlers, index
}: Props) {
  const [hovered, setHovered]   = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName]   = useState(note.name);
  const [showExport, setShowExport] = useState(false);

  function commitRename() {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== note.name) onRename(trimmed);
    setRenaming(false);
  }

  const tags = note.tags?.slice(0, 2) || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowExport(false); }}
      onClick={onClick}
      className="relative px-4 py-3 cursor-pointer border-b"
      style={{
        background   : isSelected ? 'rgba(123,184,255,0.13)' : isActive ? 'rgba(123,184,255,0.09)' : hovered ? 'rgba(255,255,255,0.028)' : 'transparent',
        borderColor  : isDragOver ? '#7bb8ff' : 'rgba(42,51,71,0.4)',
        borderLeft   : isActive ? '3px solid #7bb8ff' : isSelected ? '3px solid rgba(123,184,255,0.5)' : '3px solid transparent',
        outline      : isDragOver ? '1px solid rgba(123,184,255,0.4)' : 'none',
        transform    : hovered && !isActive ? 'translateX(1px)' : 'translateX(0)',
        transition   : 'background 150ms ease, transform 150ms ease, border-color 150ms ease',
        boxShadow    : isActive ? 'inset 0 0 0 1px rgba(123,184,255,0.07)' : 'none',
      }}
    >
      {renaming ? (
        <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setRenaming(false); setNewName(note.name); }
          }}
          onBlur={commitRename}
          onClick={e => e.stopPropagation()}
          className="w-full px-2 py-0.5 rounded text-sm outline-none"
          style={{ background: 'var(--bg2)', border: '1px solid var(--accent)', color: 'var(--text)' }}
        />
      ) : (
        <>
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {isPinned && <span className="text-[10px] shrink-0">📌</span>}
              {note.encrypted && <span className="text-[10px] shrink-0">🔒</span>}
              <span className="text-sm font-medium truncate"
                style={{ color: isActive ? '#7bb8ff' : 'var(--text)' }}>
                {note.name}
              </span>
            </div>
            <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-dim)' }}>
              {formatDate(note.mtime)}
            </span>
          </div>

          {note.firstLine && (
            <div className="text-xs truncate mb-1" style={{ color: 'var(--text-dim)' }}>
              {note.firstLine}
            </div>
          )}

          {/* Tags + actions */}
          <div className="flex items-center gap-1.5 justify-between">
            <div className="flex gap-1 flex-wrap">
              {tags.map(tag => (
                <span key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: 'rgba(123,184,255,0.1)',
                    color: '#7bb8ff',
                    border: '1px solid rgba(123,184,255,0.18)',
                    letterSpacing: '0.01em',
                  }}>
                  #{tag}
                </span>
              ))}
              {(note.tags?.length || 0) > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(42,51,71,0.4)', color: 'var(--text-dim)' }}>
                  +{(note.tags?.length || 0) - 2}
                </span>
              )}
            </div>

            {hovered && !renaming && (
              <motion.div
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.12 }}
                className="flex gap-0.5 shrink-0"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={(e) => { e.stopPropagation(); onPin(); }}
                  className="text-[10px] w-6 h-6 flex items-center justify-center rounded-md transition-all press-scale"
                  style={{
                    color: isPinned ? '#7bb8ff' : 'var(--text-dim)',
                    background: isPinned ? 'rgba(123,184,255,0.12)' : 'rgba(42,51,71,0.25)',
                  }}
                  title={isPinned ? 'Unpin' : 'Pin'}>
                  {isPinned ? '★' : '☆'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowExport(v => !v); }}
                  className="text-[10px] w-6 h-6 flex items-center justify-center rounded-md transition-all press-scale"
                  style={{ color: 'var(--text-dim)', background: 'rgba(42,51,71,0.25)' }}
                  title="Export">
                  ↓
                </button>
                <button onClick={(e) => { e.stopPropagation(); setRenaming(true); setNewName(note.name); }}
                  className="text-[10px] w-6 h-6 flex items-center justify-center rounded-md transition-all press-scale"
                  style={{ color: 'var(--text-dim)', background: 'rgba(42,51,71,0.25)' }}>
                  ✎
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-[10px] w-6 h-6 flex items-center justify-center rounded-md transition-all press-scale"
                  style={{ color: '#f85149', background: 'rgba(248,81,73,0.08)' }}>
                  ✕
                </button>
              </motion.div>
            )}
          </div>

          {/* Export submenu */}
          {showExport && (
            <div className="absolute right-4 mt-1 z-20 rounded-lg border py-1 shadow-xl"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', top: '100%', minWidth: 140 }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { onExportMd(); setShowExport(false); }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}>Export as Markdown</button>
              <button onClick={() => { onExportHtml(); setShowExport(false); }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}>Export as HTML</button>
              <button onClick={() => { onExportPdf(); setShowExport(false); }}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}>Export as PDF</button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
