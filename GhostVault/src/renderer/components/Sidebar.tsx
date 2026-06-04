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

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'notes', label: 'All Notes',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'search', label: 'Search',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'tags', label: 'Tags',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: 'vault', label: 'Browse Vault',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'templates', label: 'Templates',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'graph', label: 'Graph',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
        <line x1="7" y1="12" x2="17" y2="6"/><line x1="7" y1="12" x2="17" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'fullsearch', label: 'Full Search',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'ai', label: 'AI Assistant',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Settings',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
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
  const { notes, folders, activeNote, pinnedPaths, searchQuery, activeView, setActiveView, setSearchQuery, vaultPath } = useStore();
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
    <div
      className={`flex flex-col border-r transition-all duration-200 ${collapsed ? 'w-12' : 'w-56'}`}
      style={{ borderColor: 'var(--border)', background: 'var(--bg2)', flexShrink: 0 }}
    >
      {/* App brand */}
      {!collapsed && (
        <div className="px-4 py-3 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#7bb8ff', flexShrink: 0 }}>
            <path d="M8 2C5.8 2 4 3.8 4 6c0 2 1.2 3.4 2.4 4.4L8 14l1.6-3.6C10.8 9.4 12 8 12 6c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="6" r="1.5" fill="currentColor" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>GhostVault</span>
        </div>
      )}

      {/* Navigation */}
      <div className="py-2 border-b relative" style={{ borderColor: 'var(--border)' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors relative"
              style={{ width: 'calc(100% - 0px)' }}
            >
              {/* Framer Motion animated active indicator — 3px left border */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1 bottom-1 rounded-r-full"
                  style={{ width: 3, background: '#7bb8ff' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span
                className="relative z-10 flex-shrink-0"
                style={{ color: isActive ? '#7bb8ff' : 'var(--text-dim)' }}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span
                  className="text-xs font-medium relative z-10"
                  style={{ color: isActive ? '#7bb8ff' : 'var(--text-muted)' }}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notes list (only in notes view) */}
      {activeView === 'notes' && !collapsed && (
        <>
          {/* Search + actions */}
          <div className="px-2 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter notes…"
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
            {vaultPath && <span className="ml-1 opacity-50">· vault active</span>}
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
