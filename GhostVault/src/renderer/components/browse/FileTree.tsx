// GhostVault — FileTree (spec path: components/browse/FileTree.tsx)
// Full filesystem tree of vault directory with expand/collapse, context menu,
// new note creation, rename, delete, and reveal-in-finder

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
          name:     folderName,
          path:     `${vaultPath}/${folderRel}`,
          rel:      folderRel,
          isDir:    true,
          children: [],
        };
        dirMap[folderRel] = node;
        currentChildren.push(node);
      }
      currentChildren = dirMap[folderRel].children;
    }

    currentChildren.push({
      name:     note.filename,
      path:     note.path,
      rel:      note.rel,
      isDir:    false,
      children: [],
      note,
    });
  }

  return root;
}

interface ContextMenuState {
  x:    number;
  y:    number;
  node: TreeNode;
}

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
    // Preserve .md extension if renaming a note file and new name lacks it
    const origExt = (!renaming.node.isDir && renaming.node.name.endsWith('.md') && !safeName.endsWith('.md')) ? '.md' : '';
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
        <div className="text-3xl opacity-30">📁</div>
        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No vault configured</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onClick={() => setCtxMenu(null)}>
      {/* Toolbar */}
      <div className="px-4 py-2 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <span className="text-xs font-mono truncate max-w-xs" style={{ color: 'var(--text-dim)' }}>
          {vaultPath}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.ghostvault.revealInFinder(vaultPath)}
            className="text-[10px] px-2 py-1 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Finder
          </button>
          <button
            onClick={() => setNewNoteFolder(folders[0] || 'Notes')}
            className="text-[10px] px-2 py-1 rounded-lg font-medium"
            style={{ background: '#7bb8ff', color: '#0a0a0f' }}
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
            className="px-4 py-2 border-b flex items-center gap-2 overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'rgba(123,184,255,0.04)' }}
          >
            <select
              value={newNoteFolder}
              onChange={e => setNewNoteFolder(e.target.value)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
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
              placeholder="Note title…"
              className="flex-1 px-2 py-1 rounded text-xs outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button
              onClick={handleNewNote}
              disabled={!newNoteName.trim()}
              className="text-[10px] px-2 py-1 rounded font-medium disabled:opacity-40"
              style={{ background: '#7bb8ff', color: '#0a0a0f' }}
            >
              Create
            </button>
            <button
              onClick={() => { setNewNoteFolder(null); setNewNoteName(''); }}
              className="text-[10px] px-2 py-1 rounded border transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
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
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setRenaming(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-xl border p-5 w-80"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
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
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)' }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRenaming(null)}
                  className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={commitRename}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: '#7bb8ff', color: '#0a0a0f' }}
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
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
        onClick={() => setCtxMenu(null)}
      >
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
            <div className="text-3xl opacity-30">📂</div>
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>Vault is empty</div>
            <button
              onClick={() => setNewNoteFolder(folders[0] || 'Notes')}
              className="text-xs px-4 py-2 rounded-lg font-medium"
              style={{ background: '#7bb8ff', color: '#0a0a0f' }}
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
              className="fixed z-50 rounded-lg border py-1 shadow-xl"
              style={{
                left:       Math.min(ctxMenu.x, window.innerWidth - 176),
                top:        Math.min(ctxMenu.y, window.innerHeight - 160),
                width:      168,
                background: 'var(--bg3)',
                borderColor:'var(--border)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={startRename}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
              >
                Rename
              </button>
              <button
                onClick={() => { window.ghostvault.revealInFinder(ctxMenu.node.path); setCtxMenu(null); }}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
              >
                Reveal in Finder
              </button>
              {!ctxMenu.node.isDir && (
                <>
                  <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
                    style={{ color: '#f85149' }}
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
