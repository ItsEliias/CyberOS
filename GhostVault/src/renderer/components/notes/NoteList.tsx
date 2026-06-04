import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import NoteListItem from './NoteListItem';
import BulkActionBar from '../BulkActionBar';
import { parseMarkdown } from '../../lib/markdown';
import { FolderGroupList, NoteItemList, QuickStartTemplates } from './NoteListSections';
import type { NoteFile } from '@shared/types';

// Stable hue bucket for a tag string (0-7)
function tagHue(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return hash % 8;
}

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

type SortMode = 'modified' | 'created' | 'title' | 'size';
type SortDir  = 'desc' | 'asc';

const SORT_LABELS: Record<SortMode, string> = {
  modified: 'Modified', created: 'Created', title: 'Title', size: 'Size',
};

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
  const lines = Object.entries(contents).map(([name, c]) => `=== ${name} ===\n${c}\n`).join('\n---\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'notes-export.txt'; a.click();
  URL.revokeObjectURL(url);
}

export default function NoteList({ onOpenNote, onDeleteNote, onRenameNote }: Props) {
  const { notes, activeNote, pinnedPaths, selectedPaths, toggleSelection, clearSelection, togglePin, folders } = useStore();
  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState<SortMode>('modified');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [localOrder, setLocalOrder]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const dragIdxRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) (n.tags || []).forEach(t => s.add(t));
    return [...s].sort();
  }, [notes]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) (n.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    return counts;
  }, [notes]);

  const maxTagCount = useMemo(() => Math.max(1, ...Object.values(tagCounts)), [tagCounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let base = q
      ? notes.filter(n =>
          n.name.toLowerCase().includes(q) ||
          n.folder.toLowerCase().includes(q) ||
          (n.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (n.firstLine || '').toLowerCase().includes(q))
      : notes;
    if (activeTag) base = base.filter(n => (n.tags || []).includes(activeTag));
    const dir = sortDir === 'asc' ? 1 : -1;
    let sorted: NoteFile[];
    switch (sort) {
      case 'modified': sorted = [...base].sort((a, b) => dir * (b.mtime - a.mtime)); break;
      case 'created':  sorted = [...base].sort((a, b) => dir * ((b.ctime ?? b.mtime) - (a.ctime ?? a.mtime))); break;
      case 'title':    sorted = [...base].sort((a, b) => dir * a.name.localeCompare(b.name)); break;
      case 'size':     sorted = [...base].sort((a, b) => dir * ((b.wordCount ?? 0) - (a.wordCount ?? 0))); break;
      default: sorted = base;
    }
    if (localOrder.length > 0) {
      const om = new Map(localOrder.map((p, i) => [p, i]));
      return [...sorted].sort((a, b) => (om.get(a.path) ?? 9999) - (om.get(b.path) ?? 9999));
    }
    return sorted;
  }, [notes, search, sort, sortDir, activeTag, localOrder]);

  const pinned   = useMemo(() => filtered.filter(n => pinnedPaths.has(n.path)), [filtered, pinnedPaths]);
  const unpinned = useMemo(() => filtered.filter(n => !pinnedPaths.has(n.path)), [filtered, pinnedPaths]);

  const folderGroups = useMemo(() => {
    if (!unpinned.some(n => n.folder && n.folder !== '')) return null;
    const g: Map<string, NoteFile[]> = new Map();
    for (const n of unpinned) {
      const f = n.folder || 'Notes';
      if (!g.has(f)) g.set(f, []);
      g.get(f)!.push(n);
    }
    return g;
  }, [unpinned]);

  function toggleFolder(f: string) {
    setCollapsedFolders(prev => { const next = new Set(prev); next.has(f) ? next.delete(f) : next.add(f); return next; });
  }

  const handleOpen = useCallback((note: NoteFile, e?: React.MouseEvent) => {
    if (e?.shiftKey || e?.metaKey) toggleSelection(note.path);
    else onOpenNote(note);
  }, [onOpenNote, toggleSelection]);

  function handleDragStart(e: React.DragEvent, idx: number) { dragIdxRef.current = idx; e.dataTransfer.effectAllowed = 'move'; }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOverIdx(idx); }
  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    const srcIdx = dragIdxRef.current;
    if (srcIdx === null || srcIdx === targetIdx) { setDragOverIdx(null); return; }
    const r = [...filtered];
    const [m] = r.splice(srcIdx, 1);
    r.splice(targetIdx, 0, m);
    setLocalOrder(r.map(n => n.path));
    dragIdxRef.current = null;
    setDragOverIdx(null);
  }

  async function handleBulkDelete() { for (const p of selectedPaths) await onDeleteNote(p); clearSelection(); }
  async function handleBulkMove(folder: string) { for (const p of selectedPaths) await window.ghostvault.moveNote(p, folder); clearSelection(); }
  async function handleExportZip() { await exportZip(notes.filter(n => selectedPaths.has(n.path))); }

  function handleExportMarkdown(note: NoteFile) {
    window.ghostvault.readNote(note.path).then(c => {
      const url = URL.createObjectURL(new Blob([c], { type: 'text/markdown' }));
      Object.assign(document.createElement('a'), { href: url, download: `${note.name}.md` }).click();
      URL.revokeObjectURL(url);
    });
  }
  async function handleExportHtml(note: NoteFile) {
    const c = await window.ghostvault.readNote(note.path);
    await window.ghostvault.exportAsHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.name}</title></head><body style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px">${parseMarkdown(c)}</body></html>`, note.name);
  }
  async function handleExportPdf(note: NoteFile) {
    const c = await window.ghostvault.readNote(note.path);
    await window.ghostvault.exportAsPdf(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.name}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px}</style></head><body>${parseMarkdown(c)}</body></html>`, note.name);
  }

  const itemHandlers = {
    activeNote, selectedPaths, dragOverIdx,
    onOpen: handleOpen, onDelete: onDeleteNote, onRename: onRenameNote, onTogglePin: togglePin,
    onExportMd: handleExportMarkdown, onExportHtml: handleExportHtml, onExportPdf: handleExportPdf,
    onDragStart: handleDragStart, onDragOver: handleDragOver, onDrop: handleDrop,
  };

  return (
    <div className="flex flex-col border-r shrink-0"
      style={{ width: 320, borderColor: 'var(--border)', background: 'var(--bg2)' }}>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter notes…" className="w-full pl-8 py-1.5 rounded-lg text-xs input-glow"
            style={{ background: 'var(--bg3)', border: '1px solid rgba(42,51,71,0.6)', color: 'var(--text)', outline: 'none', paddingRight: search ? '4.5rem' : '0.75rem' }} />
          {search && <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[9px] font-mono tabular-nums pointer-events-none" style={{ color: filtered.length > 0 ? '#7bb8ff' : 'rgba(248,81,73,0.7)' }}>{filtered.length}/{notes.length}</span>}
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-[10px] transition-colors hover:bg-white/10" style={{ color: 'var(--text-dim)' }}>✕</button>}
        </div>
      </div>

      {/* Sort bar */}
      <div className="px-3 pb-2 flex gap-1 shrink-0 items-center">
        {(Object.keys(SORT_LABELS) as SortMode[]).map(s => {
          const active = sort === s;
          return (
            <button key={s} onClick={() => { if (active) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSort(s); setSortDir('desc'); } }}
              className="flex-1 py-1 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-0.5"
              style={{ background: active ? 'rgba(123,184,255,0.12)' : 'transparent', color: active ? '#7bb8ff' : 'var(--text-dim)', border: active ? '1px solid rgba(123,184,255,0.2)' : '1px solid transparent' }}>
              {SORT_LABELS[s]}
              {active && <span className="text-[8px] leading-none" style={{ color: '#7bb8ff', opacity: 0.8 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
            </button>
          );
        })}
      </div>

      {/* Tag filter chips + tag cloud */}
      {allTags.length > 0 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}>✕ clear</button>
            )}
            {allTags.map(tag => {
              const isActive = activeTag === tag;
              return (
                <button key={tag} onClick={() => setActiveTag(isActive ? null : tag)}
                  className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                  style={{ background: isActive ? 'rgba(123,184,255,0.18)' : 'rgba(123,184,255,0.06)', color: isActive ? '#7bb8ff' : 'var(--text-dim)', border: isActive ? '1px solid rgba(123,184,255,0.35)' : '1px solid rgba(123,184,255,0.12)' }}>
                  #{tag}
                </button>
              );
            })}
          </div>
          {/* Tag cloud — sized by frequency (sm / base / lg) */}
          {allTags.length > 2 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {allTags.map(tag => {
                const ratio = (tagCounts[tag] || 0) / maxTagCount;
                const fontSz = ratio >= 0.66 ? '0.75rem' : ratio >= 0.33 ? '0.6875rem' : '0.625rem';
                const isActive = activeTag === tag;
                const hue = tagHue(tag);
                return (
                  <button key={tag} onClick={() => setActiveTag(isActive ? null : tag)}
                    className={`px-1.5 py-0.5 rounded font-medium transition-colors tag-colored tag-hue-${hue}${isActive ? ' tag-colored-active' : ''}`}
                    style={{ fontSize: fontSz }} title={`${tagCounts[tag] || 0} note${(tagCounts[tag] || 0) !== 1 ? 's' : ''}`}>
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search result count / note count */}
      <div className="px-3 pb-1 text-[10px] shrink-0 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
        {search.trim()
          ? <span style={{ color: filtered.length > 0 ? 'rgba(107,122,153,0.7)' : 'rgba(248,81,73,0.6)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</span>
          : <span>{filtered.length} {filtered.length !== 1 ? 'notes' : 'note'}</span>
        }
        {selectedPaths.size > 0 && (
          <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(123,184,255,0.15)', color: '#7bb8ff' }}>{selectedPaths.size} selected</span>
        )}
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        <AnimatePresence>
          {loading && (
            <motion.div key="skeletons" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {[0, 1, 2, 3, 4].map(i => <NoteSkeletonRow key={i} delay={i} />)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned */}
        {!loading && pinned.length > 0 && (
          <>
            <div className="px-4 pt-2 pb-1 text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-dim)' }}>Pinned</div>
            <NoteItemList notes={pinned} isPinned handlers={itemHandlers} />
            <div className="mx-3 border-t my-1" style={{ borderColor: 'var(--border)' }} />
          </>
        )}

        {/* Empty states */}
        {!loading && unpinned.length === 0 && pinned.length === 0 && !search && <QuickStartTemplates />}
        {!loading && unpinned.length === 0 && pinned.length === 0 && search && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center justify-center h-full gap-4 py-8 text-center px-6">
            <div style={{ opacity: 0.35 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: '#7bb8ff' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>No results</div>
              <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)', maxWidth: '18ch', margin: '0 auto' }}>Nothing matched &ldquo;{search}&rdquo;</div>
            </div>
          </motion.div>
        )}

        {/* Notes — folder-grouped or flat */}
        {!loading && (unpinned.length > 0 || pinned.length > 0) && (
          folderGroups
            ? <FolderGroupList groups={folderGroups} collapsedFolders={collapsedFolders} onToggleFolder={toggleFolder} handlers={itemHandlers} />
            : <NoteItemList notes={unpinned} isPinned={false} handlers={itemHandlers} />
        )}
      </div>

      <BulkActionBar selectedPaths={selectedPaths} notes={notes} folders={folders}
        onDelete={handleBulkDelete} onMove={handleBulkMove} onExportZip={handleExportZip} onClear={clearSelection} />
    </div>
  );
}
