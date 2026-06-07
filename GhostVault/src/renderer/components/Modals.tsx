import { useState, useEffect, useRef, useCallback } from 'react';
export { useToast, ToastContainer } from './ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { AiCtx } from '@shared/types';

// ─── Backdrop ─────────────────────────────────────────────────────────────────
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      style={{ background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
  );
}

const FOCUSABLE_SELECTORS = 'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ModalBox({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Focus trap: auto-focus the first focusable element on mount
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
    if (first) first.focus();
  }, []);

  // Trap Tab inside the modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const el = boxRef.current;
    if (!el) return;
    const focusable = [...el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)].filter(
      n => !n.closest('[aria-hidden="true"]')
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  return (
    <motion.div
      ref={boxRef}
      className="fixed z-50 rounded-2xl border p-6"
      style={{
        top: '50%', left: '50%', x: '-50%', y: '-50%',
        width: wide ? 520 : 380,
        background: 'rgba(19,21,37,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(42,51,71,0.7)',
        boxShadow: '0 32px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(123,184,255,0.06)',
      }}
      initial={{ opacity: 0, scale: 0.92, y: '-48%' }}
      animate={{ opacity: 1, scale: 1, y: '-50%' }}
      exit={{ opacity: 0, scale: 0.92, y: '-48%' }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </motion.div>
  );
}

const INPUT_STYLE = {
  background: 'rgba(7,8,15,0.7)',
  border: '1px solid rgba(42,51,71,0.6)',
  color: 'var(--text)',
} as const;

const BTN_PRIMARY = {
  background: 'var(--accent)',
  color: '#07080f',
  fontWeight: 600,
} as const;

const BTN_CANCEL = {
  borderColor: 'rgba(42,51,71,0.6)',
  color: 'var(--text-muted)',
} as const;

// ─── New Note Modal ────────────────────────────────────────────────────────────
export function NewNoteModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (folder: string, title: string) => void;
}) {
  const folders = useStore(s => s.folders);
  const [folder, setFolder] = useState(folders[0] || 'Notes');
  const [title, setTitle]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setTitle(''); setTimeout(() => inputRef.current?.focus(), 80); } }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClick={onClose} />
          <ModalBox>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>New Note</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Add a note to your vault</div>
            <div className="space-y-3">
              <select value={folder} onChange={e => setFolder(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm input-glow"
                style={{ ...INPUT_STYLE, outline: 'none' }}>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onCreate(folder, title || 'Untitled'); if (e.key === 'Escape') onClose(); }}
                placeholder="Note title"
                className="w-full px-3 py-2.5 rounded-xl text-sm input-glow"
                style={{ ...INPUT_STYLE, outline: 'none' }} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border transition-all hover:bg-white/5 press-scale"
                style={BTN_CANCEL}>Cancel</button>
              <button onClick={() => onCreate(folder, title || 'Untitled')}
                className="px-5 py-2 rounded-xl text-sm transition-all hover:opacity-90 press-scale"
                style={BTN_PRIMARY}>Create</button>
            </div>
          </ModalBox>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── New Folder Modal ──────────────────────────────────────────────────────────
export function NewFolderModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setName(''); setTimeout(() => inputRef.current?.focus(), 80); } }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClick={onClose} />
          <ModalBox>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>New Folder</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Organise your notes</div>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()); if (e.key === 'Escape') onClose(); }}
              placeholder="Folder name"
              className="w-full px-3 py-2.5 rounded-xl text-sm input-glow"
              style={{ ...INPUT_STYLE, outline: 'none' }} />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border transition-all hover:bg-white/5 press-scale"
                style={BTN_CANCEL}>Cancel</button>
              <button onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}
                className="px-5 py-2 rounded-xl text-sm transition-all hover:opacity-90 press-scale disabled:opacity-40"
                style={BTN_PRIMARY}>Create</button>
            </div>
          </ModalBox>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Quick Capture Modal ───────────────────────────────────────────────────────
export function QuickCaptureModal({ open, onClose, onSaved }: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { folders, vaultPath } = useStore();
  const [folder, setFolder]   = useState(folders[0] || 'Notes');
  const [title, setTitle]     = useState('');
  const [text, setText]       = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) { setText(''); setTitle(''); setSaveError(null); setTimeout(() => textRef.current?.focus(), 80); } }, [open]);

  async function handleSave() {
    if (!text.trim() || !vaultPath) return;
    setSaveError(null);
    const result = await window.ghostvault.saveCaptureNote({ folder, title, text });
    if (result.ok) { onClose(); onSaved(); }
    else {
      // Without this, a failed save dismissed neither the modal nor
      // surfaced any indication — user had to guess why nothing happened.
      setSaveError(result.error || 'Failed to save');
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClick={onClose} />
          <ModalBox wide>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>⚡ Quick Capture</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Capture a thought instantly</div>
            <div className="flex gap-2 mb-3">
              <select value={folder} onChange={e => setFolder(e.target.value)}
                className="px-2.5 py-2 rounded-xl text-sm input-glow"
                style={{ ...INPUT_STYLE, outline: 'none' }}>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') textRef.current?.focus(); }}
                placeholder="Title (optional)"
                className="flex-1 px-3 py-2 rounded-xl text-sm input-glow"
                style={{ ...INPUT_STYLE, outline: 'none' }} />
            </div>
            <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="Start typing…"
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-mono resize-none mb-3 input-glow"
              style={{ ...INPUT_STYLE, outline: 'none', lineHeight: '1.7' }} />
            {saveError && (
              <div className="mb-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.35)', color: '#f85149' }}>
                {saveError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>⌘↵ save · Esc close</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border transition-all hover:bg-white/5 press-scale"
                  style={BTN_CANCEL}>Cancel</button>
                <button onClick={handleSave} disabled={!text.trim()}
                  className="px-5 py-2 rounded-xl text-sm transition-all hover:opacity-90 press-scale disabled:opacity-40"
                  style={BTN_PRIMARY}>Capture</button>
              </div>
            </div>
          </ModalBox>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── AI Result Overlay ────────────────────────────────────────────────────────
export function AiOverlay({ mode, result, onApply, onClose }: {
  mode: string;
  result: string;
  onApply: () => void;
  onClose: () => void;
}) {
  const isProcessing = !result;
  return (
    <AnimatePresence>
      <Backdrop onClick={() => { if (!isProcessing) onClose(); }} />
      <motion.div
        className="fixed z-50 rounded-xl border flex flex-col"
        style={{
          top: '50%', left: '50%', x: '-50%', y: '-50%',
          width: 620, maxHeight: '75vh',
          background: 'var(--bg3)', borderColor: 'var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,.5)'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            ✨ AI · <span className="capitalize font-normal" style={{ color: 'var(--text-muted)' }}>{mode}</span>
          </div>
          {isProcessing && (
            <div className="text-xs animate-pulse" style={{ color: 'var(--accent)' }}>Processing…</div>
          )}
        </div>

        {isProcessing ? (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-2xl animate-spin">✨</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
              <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text)' }}>
                {result}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Discard</button>
              <button onClick={onApply}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}>Apply to Note</button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── AI Action Menu ───────────────────────────────────────────────────────────
export function AiMenu({ open, onClose, onAction }: {
  open: boolean;
  onClose: () => void;
  onAction: (mode: string) => void;
}) {
  const { aiCtx, setAiCtx } = useStore();

  const ACTIONS = [
    { mode: 'format',    label: '📐 Format Note',     desc: 'Structure & clean up' },
    { mode: 'summarize', label: '📋 Summarize',        desc: 'Key points only' },
    { mode: 'todos',     label: '✅ Extract TODOs',    desc: 'Pull action items' },
    { mode: 'iocs',      label: '🔍 Extract Key Info', desc: 'IPs, creds, dates' },
    { mode: 'cleanup',   label: '🧹 Clean Up',         desc: 'Remove filler text' },
    { mode: 'terminal',  label: '💻 Structure Raw',    desc: 'Format raw input' },
    { mode: 'report',    label: '📊 Build Report',     desc: 'Professional output' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClick={onClose} />
          <motion.div
            className="fixed z-50 rounded-xl border p-4 w-[300px]"
            style={{ top: '50%', left: '50%', x: '-50%', y: '-50%', background: 'var(--bg3)', borderColor: 'var(--border)', boxShadow: '0 16px 40px rgba(0,0,0,.5)' }}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>✨ AI Actions</div>
              <div className="flex gap-1">
                {(['work', 'cyber', 'personal'] as AiCtx[]).map(ctx => (
                  <button key={ctx}
                    onClick={() => { setAiCtx(ctx); window.ghostvault.saveConfig({ aiCtx: ctx }); }}
                    className="px-1.5 py-0.5 rounded text-[9px] capitalize font-medium border transition-colors"
                    style={{
                      background  : aiCtx === ctx ? 'var(--accent)' : 'var(--bg)',
                      borderColor : aiCtx === ctx ? 'var(--accent)' : 'var(--border)',
                      color       : aiCtx === ctx ? '#fff' : 'var(--text-dim)'
                    }}>
                    {ctx}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {ACTIONS.map(a => (
                <button key={a.mode}
                  onClick={() => { onClose(); onAction(a.mode); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/10"
                >
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{a.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{a.desc}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Note Context Menu ────────────────────────────────────────────────────────
export function NoteContextMenu({ x, y, path, onClose, onDelete, onRename, onReveal, onPin, onLock }: {
  x: number; y: number; path: string;
  onClose: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onReveal: () => void;
  onPin?: () => void;
  onLock?: () => void;
}) {
  const { pinnedPaths, lockedNotes } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName]   = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const noteName  = path.split('/').pop()?.replace('.md', '') || '';
  const isPinned  = pinnedPaths.has(path);
  const isLocked  = lockedNotes.has(path);

  function startRename() {
    setNewName(noteName);
    setRenaming(true);
    setTimeout(() => renameRef.current?.select(), 50);
  }

  function commitRename() {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== noteName) onRename(trimmed);
    else onClose();
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        className="fixed z-50 rounded-lg border py-1 shadow-xl"
        style={{
          left: Math.min(x, window.innerWidth - 192),
          top: Math.min(y, window.innerHeight - 260),
          width: 184,
          background: 'var(--bg3)', borderColor: 'var(--border)'
        }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
      >
        {renaming ? (
          <div className="px-2 py-1.5">
            <input
              ref={renameRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenaming(false); onClose(); }
              }}
              className="w-full px-2 py-1 rounded text-xs outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text)' }}
            />
          </div>
        ) : (
          <>
            <button onClick={startRename}
              className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}>Rename</button>
            {onPin && (
              <button onClick={onPin}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}>
                {isPinned ? 'Unpin' : 'Pin to top'}
              </button>
            )}
            {onLock && (
              <button onClick={onLock}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}>
                {isLocked ? 'Unlock note' : 'Lock note'}
              </button>
            )}
            <button onClick={onReveal}
              className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}>Reveal in Finder</button>
            <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
            <button onClick={onDelete}
              className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10"
              style={{ color: '#f85149' }}>Delete</button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

