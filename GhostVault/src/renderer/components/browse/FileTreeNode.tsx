// GhostVault — FileTreeNode (spec path: components/browse/FileTreeNode.tsx)
// Individual node in the vault filesystem tree — directory or .md file

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NoteFile } from '@shared/types';

export interface TreeNode {
  name:     string;
  path:     string;
  rel:      string;
  isDir:    boolean;
  children: TreeNode[];
  note?:    NoteFile;
}

interface Props {
  node:           TreeNode;
  depth:          number;
  selectedPath:   string | null;
  onOpenNote:     (note: NoteFile) => void;
  onContextMenu:  (e: React.MouseEvent, node: TreeNode) => void;
}

export default function FileTreeNode({
  node, depth, selectedPath, onOpenNote, onContextMenu,
}: Props) {
  const [open, setOpen] = useState(false);
  const isSelected = node.path === selectedPath;

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          onContextMenu={e => { e.preventDefault(); onContextMenu(e, node); }}
          className="w-full flex items-center gap-2 py-1.5 rounded transition-colors hover:bg-white/5 text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: 8 }}
        >
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
            style={{ color: 'var(--text-dim)' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={{ color: '#7bb8ff', flexShrink: 0 }}
          >
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
                  selectedPath={selectedPath}
                  onOpenNote={onOpenNote}
                  onContextMenu={onContextMenu}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // File node (.md or other)
  return (
    <button
      onClick={() => node.note && onOpenNote(node.note)}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, node); }}
      className="w-full flex items-center gap-2 py-1.5 rounded transition-colors text-left"
      style={{
        paddingLeft:  `${depth * 16 + 8}px`,
        paddingRight: 8,
        background:   isSelected ? 'rgba(123,184,255,0.1)' : 'transparent',
      }}
    >
      {node.name.endsWith('.md') ? (
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{ color: isSelected ? '#7bb8ff' : 'var(--text-dim)', flexShrink: 0 }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ) : (
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{ color: 'var(--text-dim)', flexShrink: 0 }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
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
