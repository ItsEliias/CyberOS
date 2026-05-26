import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { AiCtx } from '@shared/types';

// ─── Backdrop ─────────────────────────────────────────────────────────────────
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClick}
      style={{ background: 'rgba(0,0,0,.5)' }} />
  );
}

function ModalBox({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div
      className="fixed z-50 rounded-xl border p-6"
      style={{
        top: '50%', left: '50%', x: '-50%', y: '-50%',
        width: wide ? 520 : 360,
        background: 'var(--bg3)', borderColor: 'var(--border)',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)'
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
}

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
            <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>New Note</div>
            <div className="space-y-3">
              <select value={folder} onChange={e => setFolder(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onCreate(folder, title || 'Untitled'); if (e.key === 'Escape') onClose(); }}
                placeholder="Note title"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={() => onCreate(folder, title || 'Untitled')}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}>Create</button>
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
            <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>New Folder</div>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()); if (e.key === 'Escape') onClose(); }}
              placeholder="Folder name"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={() => name.trim() && onCreate(name.trim())} disabled={!name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}>Create</button>
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
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) { setText(''); setTitle(''); setTimeout(() => textRef.current?.focus(), 80); } }, [open]);

  async function handleSave() {
    if (!text.trim() || !vaultPath) return;
    const result = await window.ghostvault.saveCaptureNote({ folder, title, text });
    if (result.ok) { onClose(); onSaved(); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClick={onClose} />
          <ModalBox wide>
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>⚡ Quick Capture</div>
            <div className="flex gap-2 mb-3">
              <select value={folder} onChange={e => setFolder(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <input value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') textRef.current?.focus(); }}
                placeholder="Title (optional)"
                className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="Start typing…"
              rows={6}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-mono resize-none outline-none mb-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', lineHeight: '1.7' }} />
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>⌘↵ to save · Esc to close</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
                <button onClick={handleSave} disabled={!text.trim()}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}>Capture</button>
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
export function NoteContextMenu({ x, y, path, onClose, onDelete, onRename, onReveal }: {
  x: number; y: number; path: string;
  onClose: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onReveal: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName]   = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const noteName  = path.split('/').pop()?.replace('.md', '') || '';

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
          left: Math.min(x, window.innerWidth - 176),
          top: Math.min(y, window.innerHeight - 200),
          width: 168,
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

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'warn' | 'info'; }

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  function addToast(text: string, type: ToastMsg['type'] = 'info', duration = 2800) {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, text, type }]);
    setTimeout(() => removeToast(id), duration);
  }

  function removeToast(id: number) {
    setToasts(t => t.filter(m => m.id !== id));
  }

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }: {
  toasts: ToastMsg[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            onClick={() => onRemove(t.id)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg pointer-events-auto cursor-pointer"
            style={{
              background: t.type === 'success' ? '#3fb950' : t.type === 'error' ? '#f85149' : t.type === 'warn' ? '#d29922' : 'var(--bg3)',
              color     : t.type === 'info' ? 'var(--text)' : '#fff',
              border    : t.type === 'info' ? '1px solid var(--border)' : 'none'
            }}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
