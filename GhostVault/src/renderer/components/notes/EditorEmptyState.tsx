// GhostVault — Editor empty state (no note selected)

import { motion } from 'framer-motion';

export default function EditorEmptyState() {
  return (
    <motion.div
      key="editor-empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8"
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ opacity: 0.22 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: '#7bb8ff' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold mb-1.5" style={{ color: 'rgba(139,148,158,0.55)' }}>
          No note open
        </div>
        <div className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(72,79,88,0.7)', maxWidth: '24ch', margin: '0 auto 12px' }}>
          Select a note from the list or create one
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'rgba(42,51,71,0.4)', color: 'rgba(123,184,255,0.6)', border: '1px solid rgba(123,184,255,0.2)' }}>
              ⌘N
            </kbd>
            <span className="text-[10px]" style={{ color: 'rgba(72,79,88,0.5)' }}>new note</span>
          </div>
          <span style={{ color: 'rgba(42,51,71,0.5)', fontSize: 10 }}>·</span>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'rgba(42,51,71,0.4)', color: 'rgba(139,148,158,0.5)', border: '1px solid rgba(42,51,71,0.5)' }}>
              ⌘S
            </kbd>
            <span className="text-[10px]" style={{ color: 'rgba(72,79,88,0.5)' }}>save</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
