import { useState, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import NoteListItem from './NoteListItem';
import BulkActionBar from '../BulkActionBar';
import { parseMarkdown } from '../../lib/markdown';
import type { NoteFile } from '@shared/types';

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
  const dragIdxRef = useRef<number | null>(null);

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
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter notes…"
          className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
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

        {/* Pinned section */}
        {pinned.length > 0 && (
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

        {/* All notes */}
        {unpinned.length === 0 && pinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center px-4">
            <div className="text-3xl opacity-30">📄</div>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {search ? 'No notes match your search' : 'No notes yet'}
            </div>
          </div>
        ) : (
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
