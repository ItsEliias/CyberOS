import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import NoteListItem from './NoteListItem';
import BulkActionBar from '../BulkActionBar';
import { parseMarkdown } from '../../lib/markdown';
import type { NoteFile } from '@shared/types';

function NoteSkeletonRow({ delay }: { delay: number }) {
  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(42,51,71,0.4)', borderLeft: '3px solid transparent', opacity: 0.7 - delay * 0.1 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="skeleton h-3 rounded" style={{ width: `${55 + delay * 10}%` }} />
        <div className="skeleton h-2 rounded w-8" />
      </div>
      <div className="skeleton h-2 rounded mb-2" style={{ width: '75%' }} />
      <div className="flex gap-1">
        <div className="skeleton h-4 rounded-full w-12" />
        {delay < 2 && <div className="skeleton h-4 rounded-full w-10" />}
      </div>
    </div>
  );
}

type SortMode = 'recent' | 'alpha' | 'tag';

interface Props {
  onOpenNote: (note: NoteFile) => void;
  onDeleteNote: (path: string) => void;
  onRenameNote: (oldPath: string, newName: string) => void;
}

async function exportZip(notes: NoteFile[]): Promise<void> {
  const contents: Record<string, string> = {};
  for (const n of notes) {
    try { contents[n.filename] = await window.ghostvault.readNote(n.path); } catch { /* skip */ }
  }
  const lines = Object.entries(contents).map(([name, c]) =>
    `=== ${name} ===\n${c}\n`
  ).join('\n---\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'notes-export.txt'; a.click();
  URL.revokeObjectURL(url);
}

export default function NoteList({ onOpenNote, onDeleteNote, onRenameNote }: Props) {
  const { notes, activeNote, pinnedPaths, selectedPaths, toggleSelection, clearSelection, togglePin, folders } = useStore();
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState<SortMode>('recent');
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [localOrder, setLocalOrder]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const dragIdxRef = useRef<number | null>(null);

  // Show skeleton briefly on first mount for a polished feel
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = q
      ? notes.filter(n =>
          n.name.toLowerCase().includes(q) ||
          n.folder.toLowerCase().includes(q) ||
          (n.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (n.firstLine || '').toLowerCase().includes(q)
        )
      : notes;

    let sorted: NoteFile[];
    switch (sort) {
      case 'recent': sorted = [...base].sort((a, b) => b.mtime - a.mtime); break;
      case 'alpha':  sorted = [...base].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'tag': {
        const byTag = (n: NoteFile) => (n.tags?.[0] || '') + n.name;
        sorted = [...base].sort((a, b) => byTag(a).localeCompare(byTag(b)));
        break;
      }
      default: sorted = base;
    }

    // Apply local drag order on top
    if (localOrder.length > 0) {
      const orderMap = new Map(localOrder.map((p, i) => [p, i]));
      return [...sorted].sort((a, b) => {
        const ai = orderMap.get(a.path) ?? 9999;
        const bi = orderMap.get(b.path) ?? 9999;
        return ai - bi;
      });
    }
    return sorted;
  }, [notes, search, sort, localOrder]);

  const pinned   = useMemo(() => filtered.filter(n => pinnedPaths.has(n.path)), [filtered, pinnedPaths]);
  const unpinned = useMemo(() => filtered.filter(n => !pinnedPaths.has(n.path)), [filtered, pinnedPaths]);

  const handleOpen = useCallback((note: NoteFile, e?: React.MouseEvent) => {
    if (e?.shiftKey || e?.metaKey) {
      toggleSelection(note.path);
    } else {
      onOpenNote(note);
    }
  }, [onOpenNote, toggleSelection]);

  function handleDragStart(e: React.DragEvent, idx: number) {
    dragIdxRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    const srcIdx = dragIdxRef.current;
    if (srcIdx === null || srcIdx === targetIdx) { setDragOverIdx(null); return; }
    const reordered = [...filtered];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setLocalOrder(reordered.map(n => n.path));
    dragIdxRef.current = null;
    setDragOverIdx(null);
  }

  async function handleBulkDelete() {
    for (const p of selectedPaths) await onDeleteNote(p);
    clearSelection();
  }

  async function handleBulkMove(folder: string) {
    for (const p of selectedPaths) {
      await window.ghostvault.moveNote(p, folder);
    }
    clearSelection();
  }

  async function handleExportZip() {
    const selected = notes.filter(n => selectedPaths.has(n.path));
    await exportZip(selected);
  }

  function handleExportMarkdown(note: NoteFile) {
    window.ghostvault.readNote(note.path).then(c => {
      const blob = new Blob([c], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${note.name}.md`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function handleExportHtml(note: NoteFile) {
    const content = await window.ghostvault.readNote(note.path);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.name}</title></head><body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px">${parseMarkdown(content)}</body></html>`;
    await window.ghostvault.exportAsHtml(html, note.name);
  }

  async function handleExportPdf(note: NoteFile) {
    const content = await window.ghostvault.readNote(note.path);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.name}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px}</style></head><body>${parseMarkdown(content)}</body></html>`;
    await window.ghostvault.exportAsPdf(html, note.name);
  }

  return (
    <div className="flex flex-col border-r shrink-0"
      style={{ width: 320, borderColor: 'var(--border)', background: 'var(--bg2)' }}>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter notes…"
            className="w-full pl-8 py-1.5 rounded-lg text-xs input-glow"
            style={{
              background: 'var(--bg3)',
              border: '1px solid rgba(42,51,71,0.6)',
              color: 'var(--text)',
              outline: 'none',
              paddingRight: search ? '4.5rem' : '0.75rem',
            }}
          />
          {/* Results count "X of Y" */}
          {search && (
            <span
              className="absolute right-7 top-1/2 -translate-y-1/2 text-[9px] font-mono tabular-nums pointer-events-none"
              style={{ color: filtered.length > 0 ? '#7bb8ff' : 'rgba(248,81,73,0.7)' }}
            >
              {filtered.length}/{notes.length}
            </span>
          )}
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-[10px] transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-dim)' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sort row */}
      <div className="px-3 pb-2 flex gap-1 shrink-0">
        {(['recent', 'alpha', 'tag'] as SortMode[]).map(s => (
          <button key={s} onClick={() => setSort(s)}
            className="flex-1 py-1 rounded text-[10px] capitalize font-medium transition-colors"
            style={{
              background : sort === s ? 'rgba(123,184,255,0.12)' : 'transparent',
              color      : sort === s ? '#7bb8ff' : 'var(--text-dim)',
              border     : sort === s ? '1px solid rgba(123,184,255,0.2)' : '1px solid transparent',
            }}>
            {s === 'recent' ? 'Recent' : s === 'alpha' ? 'A–Z' : 'Tag'}
          </button>
        ))}
      </div>

      {/* Count + selection badge */}
      <div className="px-3 pb-1 text-[10px] shrink-0 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
        <span>{filtered.length} {filtered.length !== 1 ? 'notes' : 'note'}</span>
        {selectedPaths.size > 0 && (
          <span className="px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(123,184,255,0.15)', color: '#7bb8ff' }}>
            {selectedPaths.size} selected
          </span>
        )}
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>

        {/* Skeleton loaders on initial mount */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="skeletons"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {[0, 1, 2, 3, 4].map(i => <NoteSkeletonRow key={i} delay={i} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned section */}
        {!loading && pinned.length > 0 && (
          <>
            <div className="px-4 pt-2 pb-1 text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: 'var(--text-dim)' }}>Pinned</div>
            {pinned.map((note, i) => (
              <NoteListItem key={note.path} note={note} index={i}
                isActive={activeNote?.path === note.path}
                isSelected={selectedPaths.has(note.path)}
                isPinned
                onClick={(e) => handleOpen(note, e)}
                onDelete={() => onDeleteNote(note.path)}
                onRename={(newName) => onRenameNote(note.path, newName)}
                onPin={() => togglePin(note.path)}
                onExportMd={() => handleExportMarkdown(note)}
                onExportHtml={() => handleExportHtml(note)}
                onExportPdf={() => handleExportPdf(note)}
                dragHandlers={{
                  onDragStart: (e) => handleDragStart(e, i),
                  onDragOver: (e) => handleDragOver(e, i),
                  onDrop: (e) => handleDrop(e, i),
                }}
                isDragOver={dragOverIdx === i}
              />
            ))}
            <div className="mx-3 border-t my-1" style={{ borderColor: 'var(--border)' }} />
          </>
        )}

        {/* Quick Start templates — shown when vault is empty and no search active */}
        {!loading && unpinned.length === 0 && pinned.length === 0 && !search && (
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
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                No notes yet
              </div>
              <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)', maxWidth: '18ch', margin: '0 auto' }}>
                Start from scratch or try a template
              </div>
            </div>

            {/* Quick start section */}
            <div className="w-full text-left">
              <div className="text-[9px] uppercase tracking-widest font-semibold mb-2 px-1"
                style={{ color: 'rgba(72,79,88,0.6)' }}>
                Quick Start
              </div>
              {[
                { emoji: '🔍', label: 'Pentest Report', desc: 'Scope, findings, remediation', template: '# Pentest Report\n\n**Target:** \n**Date:** \n**Scope:** \n\n## Executive Summary\n\n## Findings\n\n### Finding 1\n- **Severity:** Critical\n- **Description:** \n- **Remediation:** \n\n## Conclusion\n' },
                { emoji: '📋', label: 'CTF Writeup', desc: 'Challenge, solution, flags', template: '# CTF Writeup\n\n**Challenge:** \n**Category:** \n**Points:** \n\n## Description\n\n## Solution\n\n### Step 1\n\n## Flag\n\n`flag{}`\n' },
                { emoji: '📝', label: 'Daily Log', desc: 'Tasks, notes, references', template: `# Daily Log — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n## Tasks\n- [ ] \n- [ ] \n\n## Notes\n\n## References\n` },
              ].map(item => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1.5 text-left transition-colors group"
                  style={{
                    background: 'rgba(123,184,255,0.04)',
                    border: '1px solid rgba(42,51,71,0.4)',
                  }}
                  onClick={() => {
                    const { vaultPath, notes: n } = useStore.getState();
                    if (!vaultPath) return;
                    const name = item.label;
                    window.ghostvault.newNote(vaultPath, 'Notes', name).then(async () => {
                      const vp = vaultPath;
                      const { notes: newN, folders: newF } = await window.ghostvault.loadVault(vp);
                      const newNote = newN.find(x => x.name === name);
                      if (newNote) {
                        await window.ghostvault.saveNote(newNote.path, item.template);
                      }
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
        )}

        {/* Search empty state */}
        {!loading && unpinned.length === 0 && pinned.length === 0 && search && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center justify-center h-full gap-4 py-8 text-center px-6"
          >
            <div style={{ opacity: 0.35 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: '#7bb8ff' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>No results</div>
              <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)', maxWidth: '18ch', margin: '0 auto' }}>
                Nothing matched &ldquo;{search}&rdquo;
              </div>
            </div>
          </motion.div>
        )}

        {/* Notes list */}
        {!loading && (unpinned.length > 0 || pinned.length > 0) && (
          unpinned.map((note, i) => (
            <NoteListItem key={note.path} note={note} index={i}
              isActive={activeNote?.path === note.path}
              isSelected={selectedPaths.has(note.path)}
              isPinned={false}
              onClick={(e) => handleOpen(note, e)}
              onDelete={() => onDeleteNote(note.path)}
              onRename={(newName) => onRenameNote(note.path, newName)}
              onPin={() => togglePin(note.path)}
              onExportMd={() => handleExportMarkdown(note)}
              onExportHtml={() => handleExportHtml(note)}
              onExportPdf={() => handleExportPdf(note)}
              dragHandlers={{
                onDragStart: (e) => handleDragStart(e, i),
                onDragOver: (e) => handleDragOver(e, i),
                onDrop: (e) => handleDrop(e, i),
              }}
              isDragOver={dragOverIdx === i}
            />
          ))
        )}
      </div>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedPaths={selectedPaths}
        notes={notes}
        folders={folders}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onExportZip={handleExportZip}
        onClear={clearSelection}
      />
    </div>
  );
}
