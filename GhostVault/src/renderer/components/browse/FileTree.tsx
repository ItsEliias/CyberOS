// GhostVault — FileTree (redesigned: surface layering, soft blue accent, glass cards)

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import FileTreeNode, { type TreeNode } from './FileTreeNode';
import type { NoteFile } from '@shared/types';

function buildTree(notes: NoteFile[], vaultPath: string): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap: Record<string, TreeNode> = {};
  const sorted = [...notes].sort((a, b) => a.rel.localeCompare(b.rel));

  for (const note of sorted) {
    const parts = note.rel.split('/');
    let currentChildren = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderRel  = parts.slice(0, i + 1).join('/');
      if (!dirMap[folderRel]) {
        const node: TreeNode = {
          name: folderName, path: `${vaultPath}/${folderRel}`,
          rel: folderRel, isDir: true, children: [],
        };
        dirMap[folderRel] = node;
        currentChildren.push(node);
      }
      currentChildren = dirMap[folderRel].children;
    }
    currentChildren.push({
      name: note.filename, path: note.path,
      rel: note.rel, isDir: false, children: [], note,
    });
  }
  return root;
}

interface ContextMenuState { x: number; y: number; node: TreeNode; }

interface Props {
  onOpenNote?: (note: NoteFile) => void;
}

export default function FileTree({ onOpenNote }: Props) {
  const { vaultPath, notes, folders } = useStore();
  const [tree, setTree]               = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu]           = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming]         = useState<{ node: TreeNode; value: string } | null>(null);
  const [newNoteFolder, setNewNoteFolder] = useState<string | null>(null);
  const [newNoteName, setNewNoteName]     = useState('');

  useEffect(() => {
    if (vaultPath) setTree(buildTree(notes, vaultPath));
  }, [notes, vaultPath]);

  const refreshVault = useCallback(async () => {
    if (!vaultPath) return;
    const { notes: n, folders: f } = await window.ghostvault.loadVault(vaultPath);
    useStore.getState().setNotes(n);
    useStore.getState().setFolders(f);
  }, [vaultPath]);

  const handleOpenNote = useCallback((note: NoteFile) => {
    setSelectedPath(note.path);
    onOpenNote?.(note);
  }, [onOpenNote]);

  function handleContextMenu(e: React.MouseEvent, node: TreeNode) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, node });
  }

  async function handleDelete() {
    if (!ctxMenu) return;
    setCtxMenu(null);
    if (!ctxMenu.node.isDir) {
      await window.ghostvault.deleteNote(ctxMenu.node.path);
      await refreshVault();
    }
  }

  function startRename() {
    if (!ctxMenu) return;
    setRenaming({ node: ctxMenu.node, value: ctxMenu.node.name });
    setCtxMenu(null);
  }

  async function commitRename() {
    if (!renaming) return;
    const newName = renaming.value.trim();
    if (!newName || newName === renaming.node.name) { setRenaming(null); return; }
    const dir      = renaming.node.path.substring(0, renaming.node.path.lastIndexOf('/'));
    const safeName = newName.replace(/[/\\?%*:|"<>]/g, '-');
    const origExt  = (!renaming.node.isDir && renaming.node.name.endsWith('.md') && !safeName.endsWith('.md')) ? '.md' : '';
    const newPath  = `${dir}/${safeName}${origExt}`;
    await window.ghostvault.renameNote(renaming.node.path, newPath);
    setRenaming(null);
    await refreshVault();
  }

  async function handleNewNote() {
    if (!newNoteFolder || !newNoteName.trim() || !vaultPath) return;
    await window.ghostvault.newNote(vaultPath, newNoteFolder, newNoteName.trim());
    setNewNoteFolder(null);
    setNewNoteName('');
    await refreshVault();
  }

  if (!vaultPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="text-3xl" style={{ opacity: 0.25 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: '#484f58' }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="text-xs" style={{ color: 'rgba(72,79,88,0.7)', fontFamily: 'var(--font-display)' }}>
          No vault configured
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onClick={() => setCtxMenu(null)}>
      {/* Toolbar */}
      <div
        className="px-4 py-2 flex items-center justify-between shrink-0"
        style={{
          borderBottom: '1px solid rgba(42,51,71,0.35)',
          background: 'rgba(10,11,20,0.6)',
        }}
      >
        <span
          className="text-[10px] font-mono truncate max-w-xs"
          style={{ color: 'rgba(72,79,88,0.6)' }}
        >
          {vaultPath}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => window.ghostvault.revealInFinder(vaultPath)}
            className="text-[10px] px-2 py-1 rounded transition-colors"
            style={{
              border: '1px solid rgba(42,51,71,0.5)',
              color: 'rgba(139,148,158,0.65)',
              background: 'transparent',
              fontFamily: 'var(--font-display)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Finder
          </button>
          <button
            onClick={() => setNewNoteFolder(folders[0] || 'Notes')}
            className="text-[10px] px-2.5 py-1 rounded font-semibold transition-all"
            style={{
              background: 'rgba(123,184,255,0.12)',
              color: '#7bb8ff',
              border: '1px solid rgba(123,184,255,0.25)',
              fontFamily: 'var(--font-display)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.12)'; }}
          >
            + Note
          </button>
        </div>
      </div>

      {/* New note form */}
      <AnimatePresence>
        {newNoteFolder !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 flex items-center gap-2 overflow-hidden"
            style={{
              borderBottom: '1px solid rgba(42,51,71,0.35)',
              background: 'rgba(123,184,255,0.04)',
            }}
          >
            <select
              value={newNoteFolder}
              onChange={e => setNewNoteFolder(e.target.value)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{
                background: 'rgba(19,21,37,0.9)',
                border: '1px solid rgba(42,51,71,0.5)',
                color: '#c9d1d9',
                fontFamily: 'var(--font-display)',
              }}
            >
              {folders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input
              autoFocus
              value={newNoteName}
              onChange={e => setNewNoteName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleNewNote();
                if (e.key === 'Escape') { setNewNoteFolder(null); setNewNoteName(''); }
              }}
              placeholder="Note title..."
              className="flex-1 px-2 py-1 rounded text-xs outline-none"
              style={{
                background: 'rgba(19,21,37,0.9)',
                border: '1px solid rgba(123,184,255,0.25)',
                color: '#e6edf3',
                fontFamily: 'var(--font-display)',
              }}
            />
            <button
              onClick={handleNewNote}
              disabled={!newNoteName.trim()}
              className="text-[10px] px-2.5 py-1 rounded font-semibold disabled:opacity-40 transition-all"
              style={{
                background: 'rgba(123,184,255,0.15)',
                color: '#7bb8ff',
                border: '1px solid rgba(123,184,255,0.3)',
              }}
            >
              Create
            </button>
            <button
              onClick={() => { setNewNoteFolder(null); setNewNoteName(''); }}
              className="text-[10px] px-2 py-1 rounded transition-colors"
              style={{
                border: '1px solid rgba(42,51,71,0.5)',
                color: 'rgba(139,148,158,0.7)',
                background: 'transparent',
              }}
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename dialog */}
      <AnimatePresence>
        {renaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setRenaming(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-xl p-5 w-80"
              style={{
                background: 'rgba(13,14,24,0.96)',
                border: '1px solid rgba(42,51,71,0.6)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="text-sm font-semibold mb-3"
                style={{ color: '#e6edf3', fontFamily: 'var(--font-display)' }}
              >
                Rename {renaming.node.isDir ? 'Folder' : 'Note'}
              </div>
              <input
                autoFocus
                value={renaming.value}
                onChange={e => setRenaming(r => r ? { ...r, value: e.target.value } : null)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenaming(null);
                }}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4"
                style={{
                  background: 'rgba(7,8,15,0.8)',
                  border: '1px solid rgba(123,184,255,0.3)',
                  color: '#e6edf3',
                  fontFamily: 'var(--font-display)',
                  caretColor: '#7bb8ff',
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRenaming(null)}
                  className="px-4 py-2 rounded-lg text-xs transition-colors"
                  style={{
                    border: '1px solid rgba(42,51,71,0.5)',
                    color: 'rgba(139,148,158,0.75)',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={commitRename}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(123,184,255,0.15)',
                    color: '#7bb8ff',
                    border: '1px solid rgba(123,184,255,0.3)',
                  }}
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto px-2 py-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(42,51,71,0.4) transparent' }}
        onClick={() => setCtxMenu(null)}
      >
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: '#484f58', opacity: 0.5 }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <div className="text-xs" style={{ color: 'rgba(72,79,88,0.7)', fontFamily: 'var(--font-display)' }}>
              Vault is empty
            </div>
            <button
              onClick={() => setNewNoteFolder(folders[0] || 'Notes')}
              className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
              style={{
                background: 'rgba(123,184,255,0.12)',
                color: '#7bb8ff',
                border: '1px solid rgba(123,184,255,0.25)',
              }}
            >
              Create first note
            </button>
          </div>
        ) : (
          tree.map(node => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onOpenNote={handleOpenNote}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
            <motion.div
              className="fixed z-50 rounded-lg py-1"
              style={{
                left: Math.min(ctxMenu.x, window.innerWidth - 176),
                top: Math.min(ctxMenu.y, window.innerHeight - 160),
                width: 168,
                background: 'rgba(13,14,24,0.96)',
                border: '1px solid rgba(42,51,71,0.6)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={startRename}
                className="w-full text-left px-4 py-2 text-xs transition-colors"
                style={{ color: 'rgba(139,148,158,0.8)', fontFamily: 'var(--font-display)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Rename
              </button>
              <button
                onClick={() => { window.ghostvault.revealInFinder(ctxMenu.node.path); setCtxMenu(null); }}
                className="w-full text-left px-4 py-2 text-xs transition-colors"
                style={{ color: 'rgba(139,148,158,0.8)', fontFamily: 'var(--font-display)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Reveal in Finder
              </button>
              {!ctxMenu.node.isDir && (
                <>
                  <div className="my-1" style={{ borderTop: '1px solid rgba(42,51,71,0.4)' }} />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-xs transition-colors"
                    style={{ color: '#f85149', fontFamily: 'var(--font-display)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    Delete
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
