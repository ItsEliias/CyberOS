import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { NoteFile, ViewId } from '@shared/types';

interface Props {
  onNewNote    : () => void;
  onNewFolder  : () => void;
  onOpenNote   : (note: NoteFile) => void;
  onContextMenu: (e: React.MouseEvent, note: NoteFile) => void;
}

const NAV_ITEMS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'notes',     label: 'Notes',     icon: '📝' },
  { id: 'capture',  label: 'Capture',   icon: '⚡' },
  { id: 'vault',    label: 'Vault',     icon: '📁' },
  { id: 'templates',label: 'Templates', icon: '🗂' },
  { id: 'settings', label: 'Settings',  icon: '⚙' },
];

function FolderSection({ label, notes, folderKey, activeNote, pinnedPaths, onOpenNote, onContextMenu }: {
  label: string; notes: NoteFile[]; folderKey: string;
  activeNote: NoteFile | null; pinnedPaths: Set<string>;
  onOpenNote: (n: NoteFile) => void;
  onContextMenu: (e: React.MouseEvent, n: NoteFile) => void;
}) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(`folder-open-${folderKey}`);
    return stored === null ? true : stored === 'true';
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem(`folder-open-${folderKey}`, String(next));
  }

  return (
    <div className="mb-1">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left group hover:bg-white/5 rounded transition-colors"
      >
        <span className={`text-[10px] transition-transform ${open ? 'rotate-90' : ''}`}
          style={{ color: 'var(--text-dim)' }}>▶</span>
        <span className="flex-1 text-[11px] font-semibold truncate uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{notes.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {notes.map(note => (
              <button
                key={note.path}
                onClick={() => onOpenNote(note)}
                onContextMenu={e => onContextMenu(e, note)}
                className={`w-full flex items-center gap-2 px-5 py-1.5 text-left text-[12px] truncate transition-colors rounded mx-1 ${
                  activeNote?.path === note.path ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                style={{ color: activeNote?.path === note.path ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {pinnedPaths.has(note.path) && <span className="text-[10px] flex-shrink-0">📌</span>}
                <span className="truncate">{note.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({ onNewNote, onNewFolder, onOpenNote, onContextMenu }: Props) {
  const { notes, folders, activeNote, pinnedPaths, searchQuery, activeView, setActiveView, setSearchQuery } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNotes = useCallback(() => {
    const q = searchQuery.toLowerCase().trim();
    return q
      ? notes.filter(n => n.name.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q))
      : notes;
  }, [notes, searchQuery])();

  const byFolder: Record<string, NoteFile[]> = {};
  for (const n of filteredNotes) {
    const f = n.folder || '/';
    if (!byFolder[f]) byFolder[f] = [];
    byFolder[f].push(n);
  }

  const pinned = searchQuery ? [] : notes.filter(n => pinnedPaths.has(n.path));
  const folderOrder = [...new Set([...folders, ...Object.keys(byFolder)])].filter(f => f !== '/' && f !== '');
  const rootNotes   = byFolder['/'] || byFolder[''] || [];

  return (
    <div className={`flex flex-col border-r transition-all duration-200 ${collapsed ? 'w-12' : 'w-56'}`}
      style={{ borderColor: 'var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>

      {/* Navigation */}
      <div className="py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded mx-1 ${
              activeView === item.id ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
            style={{ width: 'calc(100% - 8px)' }}
          >
            <span className="text-sm">{item.icon}</span>
            {!collapsed && (
              <span className="text-xs font-medium"
                style={{ color: activeView === item.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notes list (only in notes view) */}
      {activeView === 'notes' && !collapsed && (
        <>
          {/* Search + actions */}
          <div className="px-2 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes…"
              className="w-full px-2 py-1.5 rounded text-xs outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-1 mt-1.5">
              <button onClick={onNewNote}
                className="flex-1 text-[10px] py-1 rounded text-center transition-colors hover:bg-white/10"
                style={{ background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                + Note
              </button>
              <button onClick={onNewFolder}
                className="flex-1 text-[10px] py-1 rounded text-center transition-colors hover:bg-white/10"
                style={{ background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                + Folder
              </button>
            </div>
          </div>

          {/* Note tree */}
          <div className="flex-1 overflow-y-auto py-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            {pinned.length > 0 && (
              <FolderSection label="📌 Pinned" notes={pinned} folderKey="pinned"
                activeNote={activeNote} pinnedPaths={pinnedPaths}
                onOpenNote={onOpenNote} onContextMenu={onContextMenu} />
            )}
            {folderOrder.map(folder => (
              <FolderSection key={folder} label={folder} notes={byFolder[folder] || []} folderKey={folder}
                activeNote={activeNote} pinnedPaths={pinnedPaths}
                onOpenNote={onOpenNote} onContextMenu={onContextMenu} />
            ))}
            {rootNotes.length > 0 && (
              <FolderSection label="📄 Root" notes={rootNotes} folderKey="/"
                activeNote={activeNote} pinnedPaths={pinnedPaths}
                onOpenNote={onOpenNote} onContextMenu={onContextMenu} />
            )}
            {filteredNotes.length === 0 && (
              <div className="px-4 py-6 text-center text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {searchQuery ? 'No notes match your search' : 'No notes yet.\nClick + Note to get started.'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(c => !c)}
        className="px-2 py-2 border-t transition-colors hover:bg-white/5 text-center text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
        {collapsed ? '›' : '‹'}
      </button>
    </div>
  );
}
