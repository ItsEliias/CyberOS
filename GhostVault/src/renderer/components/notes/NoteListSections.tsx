// GhostVault — NoteList sub-components split for line-count compliance

import { AnimatePresence, motion } from 'framer-motion';
import NoteListItem from './NoteListItem';
import { useStore } from '../../store';
import type { NoteFile } from '@shared/types';

interface NoteItemHandlers {
  activeNote: NoteFile | null;
  selectedPaths: Set<string>;
  dragOverIdx: number | null;
  onOpen: (note: NoteFile, e?: React.MouseEvent) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onTogglePin: (path: string) => void;
  onExportMd: (note: NoteFile) => void;
  onExportHtml: (note: NoteFile) => void;
  onExportPdf: (note: NoteFile) => void;
  onDragStart: (e: React.DragEvent, i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: (e: React.DragEvent, i: number) => void;
}

export function NoteItemList({ notes, isPinned, handlers }: {
  notes: NoteFile[];
  isPinned: boolean;
  handlers: NoteItemHandlers;
}) {
  return (
    <>
      {notes.map((note, i) => (
        <NoteListItem key={note.path} note={note} index={i}
          isActive={handlers.activeNote?.path === note.path}
          isSelected={handlers.selectedPaths.has(note.path)}
          isPinned={isPinned}
          onClick={(e) => handlers.onOpen(note, e)}
          onDelete={() => handlers.onDelete(note.path)}
          onRename={(n) => handlers.onRename(note.path, n)}
          onPin={() => handlers.onTogglePin(note.path)}
          onExportMd={() => handlers.onExportMd(note)}
          onExportHtml={() => handlers.onExportHtml(note)}
          onExportPdf={() => handlers.onExportPdf(note)}
          dragHandlers={{
            onDragStart: (e) => handlers.onDragStart(e, i),
            onDragOver: (e) => handlers.onDragOver(e, i),
            onDrop: (e) => handlers.onDrop(e, i),
          }}
          isDragOver={handlers.dragOverIdx === i}
        />
      ))}
    </>
  );
}

export function FolderGroupList({ groups, collapsedFolders, onToggleFolder, handlers }: {
  groups: Map<string, NoteFile[]>;
  collapsedFolders: Set<string>;
  onToggleFolder: (folder: string) => void;
  handlers: NoteItemHandlers;
}) {
  return (
    <>
      {[...groups.entries()].map(([folder, notes]) => {
        const collapsed = collapsedFolders.has(folder);
        return (
          <div key={folder}>
            <button
              onClick={() => onToggleFolder(folder)}
              className="w-full flex items-center gap-1.5 px-3 pt-2 pb-1 text-left"
              style={{ background: 'transparent' }}
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                style={{
                  color: 'var(--text-dim)',
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[9px] uppercase tracking-widest font-semibold truncate" style={{ color: 'var(--text-dim)' }}>
                {folder}
              </span>
              <span className="text-[9px] ml-auto tabular-nums" style={{ color: 'rgba(107,122,153,0.4)' }}>
                {notes.length}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="folder-items"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <NoteItemList notes={notes} isPinned={false} handlers={handlers} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}

export function QuickStartTemplates() {
  const templates = [
    { emoji: '🔍', label: 'Pentest Report', desc: 'Scope, findings, remediation', template: '# Pentest Report\n\n**Target:** \n**Date:** \n**Scope:** \n\n## Executive Summary\n\n## Findings\n\n### Finding 1\n- **Severity:** Critical\n- **Description:** \n- **Remediation:** \n\n## Conclusion\n' },
    { emoji: '📋', label: 'CTF Writeup', desc: 'Challenge, solution, flags', template: '# CTF Writeup\n\n**Challenge:** \n**Category:** \n**Points:** \n\n## Description\n\n## Solution\n\n### Step 1\n\n## Flag\n\n`flag{}`\n' },
    { emoji: '📝', label: 'Daily Log', desc: 'Tasks, notes, references', template: `# Daily Log — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n## Tasks\n- [ ] \n- [ ] \n\n## Notes\n\n## References\n` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex flex-col items-center gap-5 py-8 px-4 text-center"
    >
      <div style={{ opacity: 0.3 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: '#7bb8ff' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      </div>
      <div>
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>No notes yet</div>
        <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)', maxWidth: '18ch', margin: '0 auto' }}>
          Start from scratch or try a template
        </div>
      </div>
      <div className="w-full text-left">
        <div className="text-[9px] uppercase tracking-widest font-semibold mb-2 px-1" style={{ color: 'rgba(72,79,88,0.6)' }}>
          Quick Start
        </div>
        {templates.map(item => (
          <button
            key={item.label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1.5 text-left transition-colors group"
            style={{ background: 'rgba(123,184,255,0.04)', border: '1px solid rgba(42,51,71,0.4)' }}
            onClick={() => {
              const { vaultPath } = useStore.getState();
              if (!vaultPath) return;
              window.ghostvault.newNote(vaultPath, 'Notes', item.label).then(async () => {
                const { notes: newN, folders: newF } = await window.ghostvault.loadVault(vaultPath);
                const newNote = newN.find((x: NoteFile) => x.name === item.label);
                if (newNote) await window.ghostvault.saveNote(newNote.path, item.template);
                useStore.getState().setNotes(newN);
                useStore.getState().setFolders(newF);
              });
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(123,184,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(42,51,71,0.4)'; }}
          >
            <span className="text-base">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium" style={{ color: '#c9d1d9' }}>{item.label}</div>
              <div className="text-[9px] truncate" style={{ color: 'rgba(107,122,153,0.7)' }}>{item.desc}</div>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ color: 'rgba(107,122,153,0.4)', flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
