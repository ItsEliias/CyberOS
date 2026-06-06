// GhostVault — Sidebar (redesigned: dark surface, accent left-bar on active items)

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import HelpTip from './ui/HelpTip';
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'search', label: 'Search',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'tags', label: 'Tags',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    id: 'vault', label: 'Browse Vault',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'templates', label: 'Templates',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'graph', label: 'Graph',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
        <line x1="7" y1="12" x2="17" y2="6"/><line x1="7" y1="12" x2="17" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'fullsearch', label: 'Full Search',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'ai', label: 'AI Assistant',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Settings',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 9 3V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

interface FolderSectionProps {
  label: string;
  notes: NoteFile[];
  folderKey: string;
  activeNote: NoteFile | null;
  pinnedPaths: Set<string>;
  onOpenNote: (n: NoteFile) => void;
  onContextMenu: (e: React.MouseEvent, n: NoteFile) => void;
}

function FolderSection({ label, notes, folderKey, activeNote, pinnedPaths, onOpenNote, onContextMenu }: FolderSectionProps) {
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
    <div className="mb-0.5">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1.5 px-3 py-1 text-left rounded transition-colors"
        style={{ fontFamily: 'var(--font-display)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span
          className={`text-[9px] transition-transform ${open ? 'rotate-90' : ''}`}
          style={{ color: 'rgba(72,79,88,0.7)' }}
        >
          ▶
        </span>
        <span
          className="flex-1 text-[10px] font-semibold truncate uppercase tracking-wider"
          style={{ color: 'rgba(139,148,158,0.65)' }}
        >
          {label}
        </span>
        <span className="text-[9px]" style={{ color: 'rgba(72,79,88,0.55)' }}>
          {notes.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            {notes.map(note => {
              const isActive = activeNote?.path === note.path;
              return (
                <button
                  key={note.path}
                  onClick={() => onOpenNote(note)}
                  onContextMenu={e => onContextMenu(e, note)}
                  className="w-full flex items-center gap-2 px-5 py-1 text-left text-xs truncate transition-colors relative rounded mx-1"
                  style={{
                    background: isActive ? 'rgba(123,184,255,0.08)' : 'transparent',
                    color: isActive ? '#e6edf3' : 'rgba(139,148,158,0.75)',
                    width: 'calc(100% - 8px)',
                    borderLeft: isActive ? '2px solid #7bb8ff' : '2px solid transparent',
                    paddingLeft: isActive ? '18px' : '20px',
                    fontFamily: 'var(--font-display)',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {pinnedPaths.has(note.path) && (
                    <span className="text-[9px] flex-shrink-0" style={{ color: '#7bb8ff', opacity: 0.7 }}>
                      +
                    </span>
                  )}
                  <span className="truncate text-[11px]">{note.name}</span>
                </button>
              );
            })}
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
      className={`flex flex-col transition-all duration-200 shrink-0 ${collapsed ? 'w-11' : 'w-56'}`}
      style={{
        borderRight: '1px solid rgba(42,51,71,0.35)',
        background: '#0a0b13',
      }}
    >
      {/* Nav items */}
      <div className="py-2 px-1.5" style={{ borderBottom: '1px solid rgba(42,51,71,0.3)' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left relative"
              style={{
                fontFamily: 'var(--font-display)',
                background: isActive ? 'rgba(123,184,255,0.1)' : 'transparent',
                transition: 'background 150ms ease',
                marginBottom: 1,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(123,184,255,0.1)', border: '1px solid rgba(123,184,255,0.15)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span
                className="relative z-10 flex-shrink-0"
                style={{ color: isActive ? '#7bb8ff' : 'rgba(72,79,88,0.75)', filter: isActive ? 'drop-shadow(0 0 4px rgba(123,184,255,0.4))' : 'none' }}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span
                  className="text-[11px] font-medium relative z-10"
                  style={{ color: isActive ? '#e6edf3' : 'rgba(139,148,158,0.65)' }}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notes list (only in notes view and expanded) */}
      {activeView === 'notes' && !collapsed && (
        <>
          {/* Search + actions */}
          <div className="px-2 py-2" style={{ borderBottom: '1px solid rgba(42,51,71,0.3)' }}>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(139,148,158,0.5)', fontFamily: 'var(--font-display)' }}
              >
                Notes
              </span>
              <HelpTip
                title="Note list"
                body="Type to filter notes by name or folder. Use + Note to create a new note in the active folder, + Folder to add a new section. Right-click a note for pin / rename / delete."
              />
            </div>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter notes..."
                className="w-full px-2.5 py-1.5 rounded text-[11px] outline-none transition-colors"
                style={{
                  background: 'rgba(19,21,37,0.8)',
                  border: '1px solid rgba(42,51,71,0.5)',
                  color: '#c9d1d9',
                  fontFamily: 'var(--font-display)',
                  paddingRight: '0.625rem',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(123,184,255,0.3)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(42,51,71,0.5)'; }}
              />
            </div>
            {/* Results count below input */}
            {searchQuery && (
              <div className="mt-1 px-0.5 text-[9px] font-mono tabular-nums"
                style={{ color: filteredNotes.length > 0 ? 'rgba(123,184,255,0.7)' : 'rgba(248,81,73,0.65)' }}>
                {filteredNotes.length} of {notes.length} notes
              </div>
            )}
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={onNewNote}
                className="flex-1 text-[10px] py-1 rounded text-center transition-colors font-medium"
                style={{
                  background: 'rgba(123,184,255,0.08)',
                  color: '#7bb8ff',
                  border: '1px solid rgba(123,184,255,0.2)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.08)'; }}
              >
                + Note
              </button>
              <button
                onClick={onNewFolder}
                className="flex-1 text-[10px] py-1 rounded text-center transition-colors"
                style={{
                  background: 'rgba(42,51,71,0.2)',
                  color: 'rgba(139,148,158,0.7)',
                  border: '1px solid rgba(42,51,71,0.4)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,51,71,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(42,51,71,0.2)'; }}
              >
                + Folder
              </button>
            </div>
          </div>

          {/* Note tree */}
          <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
            <span
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(139,148,158,0.5)', fontFamily: 'var(--font-display)' }}
            >
              Folders
            </span>
            <HelpTip
              title="Folder tree"
              body="Your vault's folder structure. Click a folder name to expand or collapse. Pinned notes always appear at the top; root-level notes live under Root."
            />
          </div>
          <div
            className="flex-1 overflow-y-auto py-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(42,51,71,0.4) transparent' }}
          >
            {pinned.length > 0 && (
              <FolderSection
                label="Pinned" notes={pinned} folderKey="pinned"
                activeNote={activeNote} pinnedPaths={pinnedPaths}
                onOpenNote={onOpenNote} onContextMenu={onContextMenu}
              />
            )}
            {folderOrder.map(folder => (
              <FolderSection
                key={folder} label={folder} notes={byFolder[folder] || []} folderKey={folder}
                activeNote={activeNote} pinnedPaths={pinnedPaths}
                onOpenNote={onOpenNote} onContextMenu={onContextMenu}
              />
            ))}
            {rootNotes.length > 0 && (
              <FolderSection
                label="Root" notes={rootNotes} folderKey="/"
                activeNote={activeNote} pinnedPaths={pinnedPaths}
                onOpenNote={onOpenNote} onContextMenu={onContextMenu}
              />
            )}
            {filteredNotes.length === 0 && (
              <div
                className="px-4 py-6 text-center text-[11px] leading-relaxed"
                style={{ color: 'rgba(72,79,88,0.7)', fontFamily: 'var(--font-display)' }}
              >
                {searchQuery ? 'No notes match your search' : 'No notes yet.\nClick + Note to get started.'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-3 py-1.5 text-[10px]"
            style={{
              borderTop: '1px solid rgba(42,51,71,0.3)',
              color: 'rgba(72,79,88,0.6)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            {vaultPath && <span className="ml-1 opacity-60">· vault active</span>}
          </div>
        </>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="px-2 py-2 text-center text-sm transition-colors"
        style={{
          borderTop: '1px solid rgba(42,51,71,0.3)',
          color: 'rgba(72,79,88,0.55)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </div>
  );
}
