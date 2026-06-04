// GhostVault — Vault Browser (Screen 4)
// Full filesystem tree of configured vault, expand/collapse folders, context menus

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { NoteFile } from '@shared/types';
import { VaultStatRing, VaultWordSpark } from './ui/VaultStats';

interface TreeNode {
  name: string;
  path: string;
  rel: string;
  isDir: boolean;
  children: TreeNode[];
  note?: NoteFile;
}

function buildTree(notes: NoteFile[], vaultPath: string): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap: Record<string, TreeNode> = {};

  // Sort notes by path
  const sorted = [...notes].sort((a, b) => a.rel.localeCompare(b.rel));

  for (const note of sorted) {
    const parts = note.rel.split('/');
    let currentChildren = root;

    // Create folder nodes as needed
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderRel = parts.slice(0, i + 1).join('/');
      if (!dirMap[folderRel]) {
        const node: TreeNode = {
          name: folderName,
          path: `${vaultPath}/${folderRel}`,
          rel: folderRel,
          isDir: true,
          children: [],
        };
        dirMap[folderRel] = node;
        currentChildren.push(node);
      }
      currentChildren = dirMap[folderRel].children;
    }

    // Add file node
    currentChildren.push({
      name: note.name,
      path: note.path,
      rel: note.rel,
      isDir: false,
      children: [],
      note,
    });
  }

  return root;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode;
}

function FileTreeNode({
  node,
  depth,
  onOpenNote,
  onContextMenu,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  onOpenNote: (note: NoteFile) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  selectedPath: string | null;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isSelected = node.path === selectedPath;

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          onContextMenu={e => onContextMenu(e, node)}
          className="w-full flex items-center gap-2 py-1.5 rounded transition-colors hover:bg-white/5 text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: 8 }}
        >
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
            style={{ color: 'var(--text-dim)' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#7bb8ff', flexShrink: 0 }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>
            {node.name}
          </span>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-dim)' }}>
            {node.children.filter(c => !c.isDir).length}
          </span>
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
              {node.children.map(child => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  onOpenNote={onOpenNote}
                  onContextMenu={onContextMenu}
                  selectedPath={selectedPath}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button
      onClick={() => node.note && onOpenNote(node.note)}
      onContextMenu={e => onContextMenu(e, node)}
      className="w-full flex items-center gap-2 py-1.5 rounded transition-colors text-left"
      style={{
        paddingLeft: `${depth * 16 + 8}px`,
        paddingRight: 8,
        background: isSelected ? 'rgba(123,184,255,0.1)' : 'transparent',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span
        className="text-xs truncate"
        style={{ color: isSelected ? '#7bb8ff' : 'var(--text-muted)' }}
      >
        {node.name}
      </span>
      {node.note && (
        <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
          {new Date(node.note.mtime).toLocaleDateString()}
        </span>
      )}
    </button>
  );
}

interface Props {
  onOpenNote?: (note: NoteFile) => void;
}

export default function VaultView({ onOpenNote }: Props) {
  const { vaultPath, notes, folders } = useStore();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming] = useState<{ node: TreeNode; value: string } | null>(null);
  const [newNoteFolder, setNewNoteFolder] = useState<string | null>(null);
  const [newNoteName, setNewNoteName] = useState('');

  useEffect(() => {
    if (vaultPath && notes.length >= 0) {
      setTree(buildTree(notes, vaultPath));
    }
  }, [notes, vaultPath]);

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
    const { node } = ctxMenu;
    setCtxMenu(null);
    if (!node.isDir) {
      await window.ghostvault.deleteNote(node.path);
      const { vaultPath: vp } = useStore.getState();
      if (vp) {
        const { notes: n, folders: f } = await window.ghostvault.loadVault(vp);
        useStore.getState().setNotes(n);
        useStore.getState().setFolders(f);
      }
    }
  }

  async function handleReveal() {
    if (!ctxMenu) return;
    window.ghostvault.revealInFinder(ctxMenu.node.path);
    setCtxMenu(null);
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
    const dir = renaming.node.path.substring(0, renaming.node.path.lastIndexOf('/'));
    const ext = renaming.node.isDir ? '' : '.md';
    const newPath = `${dir}/${newName.replace(/[/\\?%*:|"<>]/g, '-')}${ext}`;
    await window.ghostvault.renameNote(renaming.node.path, newPath);
    setRenaming(null);
    const { vaultPath: vp } = useStore.getState();
    if (vp) {
      const { notes: n, folders: f } = await window.ghostvault.loadVault(vp);
      useStore.getState().setNotes(n);
      useStore.getState().setFolders(f);
    }
  }

  async function handleNewNote() {
    if (!newNoteFolder || !newNoteName.trim() || !vaultPath) return;
    await window.ghostvault.newNote(vaultPath, newNoteFolder, newNoteName.trim());
    setNewNoteFolder(null);
    setNewNoteName('');
    const { notes: n, folders: f } = await window.ghostvault.loadVault(vaultPath);
    useStore.getState().setNotes(n);
    useStore.getState().setFolders(f);
  }

  async function changeVault() {
    const p = await window.ghostvault.pickVaultDir();
    if (p) {
      await window.ghostvault.saveConfig({ vaultPath: p });
      window.location.reload();
    }
  }

  if (!vaultPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="text-4xl opacity-30">📁</div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>No vault configured</div>
        <button onClick={changeVault}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#7bb8ff', color: '#0a0a0f' }}>
          Select Vault…
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onClick={() => setCtxMenu(null)}>
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div>
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>Browse Vault</div>
          <div className="text-xs mt-0.5 font-mono truncate max-w-xs" style={{ color: 'var(--text-dim)' }}>
            {vaultPath}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.ghostvault.revealInFinder(vaultPath)}
            className="text-xs px-3 py-1.5 rounded-xl border transition-all hover:bg-white/5 press-scale"
            style={{ borderColor: 'rgba(42,51,71,0.6)', color: 'var(--text-muted)' }}
          >
            Reveal in Finder
          </button>
          <button
            onClick={() => setNewNoteFolder(folders[0] || 'Notes')}
            className="text-xs px-4 py-1.5 rounded-xl font-semibold transition-all hover:opacity-90 press-scale"
            style={{ background: '#7bb8ff', color: '#07080f' }}
          >
            + New Note
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-6 py-3 border-b flex gap-3 shrink-0 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        {/* Notes stat with progress ring */}
        <VaultStatRing
          label="Notes"
          value={notes.length}
          max={Math.max(notes.length, 20)}
          color="#7bb8ff"
          sub={notes.length > 0
            ? `last mod ${new Date(Math.max(...notes.map(n => n.mtime))).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            : 'empty vault'}
        />
        {/* Folders stat with progress ring */}
        <VaultStatRing
          label="Folders"
          value={folders.length}
          max={Math.max(folders.length, 10)}
          color="#a8d4ff"
          sub={`${folders.length > 0 ? folders.slice(0, 2).join(', ') + (folders.length > 2 ? '…' : '') : 'none'}`}
        />
        {/* Total word count sparkline */}
        {notes.length > 0 && (
          <VaultWordSpark notes={notes} />
        )}
      </div>

      {/* New note form */}
      <AnimatePresence>
        {newNoteFolder !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-3 border-b flex items-center gap-3 overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'rgba(123,184,255,0.04)' }}
          >
            <select
              value={newNoteFolder}
              onChange={e => setNewNoteFolder(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs outline-none"
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
              className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button onClick={handleNewNote} disabled={!newNoteName.trim()}
              className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
              style={{ background: '#7bb8ff', color: '#0a0a0f' }}>
              Create
            </button>
            <button onClick={() => { setNewNoteFolder(null); setNewNoteName(''); }}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename form */}
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
                <button onClick={() => setRenaming(null)}
                  className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button onClick={commitRename}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: '#7bb8ff', color: '#0a0a0f' }}>
                  Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File tree */}
      <div
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
        onClick={() => setCtxMenu(null)}
      >
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
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
              onOpenNote={handleOpenNote}
              onContextMenu={handleContextMenu}
              selectedPath={selectedPath}
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
              className="fixed z-50 rounded-xl border py-1.5 shadow-2xl"
              style={{
                left: Math.min(ctxMenu.x, window.innerWidth - 200),
                top: Math.min(ctxMenu.y, window.innerHeight - 160),
                width: 196,
                background: 'rgba(13,14,24,0.97)',
                borderColor: 'rgba(42,51,71,0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(123,184,255,0.06)',
              }}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Context label */}
              <div className="px-3 pb-1 pt-0.5 text-[9px] uppercase tracking-widest font-semibold"
                style={{ color: 'rgba(72,79,88,0.6)' }}>
                {ctxMenu.node.isDir ? 'Folder' : 'Note'}
              </div>
              <div className="border-t mb-1" style={{ borderColor: 'rgba(42,51,71,0.4)' }} />
              <button onClick={startRename}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.07] rounded mx-1"
                style={{ color: 'var(--text-muted)', width: 'calc(100% - 8px)' }}>
                <span>Rename</span>
                <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(42,51,71,0.5)', color: 'rgba(107,122,153,0.8)', border: '1px solid rgba(42,51,71,0.6)' }}>
                  F2
                </kbd>
              </button>
              <button onClick={handleReveal}
                className="w-full flex items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.07] rounded mx-1"
                style={{ color: 'var(--text-muted)', width: 'calc(100% - 8px)' }}>
                Reveal in Finder
              </button>
              {!ctxMenu.node.isDir && (
                <>
                  <div className="border-t mx-2 my-1" style={{ borderColor: 'rgba(42,51,71,0.4)' }} />
                  <button onClick={handleDelete}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-red-500/10 rounded mx-1"
                    style={{ color: '#f85149', width: 'calc(100% - 8px)' }}>
                    <span>Delete</span>
                    <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: 'rgba(248,81,73,0.1)', color: 'rgba(248,81,73,0.7)', border: '1px solid rgba(248,81,73,0.2)' }}>
                      Del
                    </kbd>
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
