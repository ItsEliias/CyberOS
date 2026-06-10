// CustomSlotModal — add/edit custom app slot.
// Migration: replaced old parallel token vars with canonical tokens.css vars.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomSlot } from '@shared/types';

interface Props {
  open: boolean;
  initial?: CustomSlot | null;
  onSave: (slot: CustomSlot) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
} as React.CSSProperties;

export default function CustomSlotModal({ open, initial, onSave, onClose, onDelete }: Props) {
  const [name, setName]     = useState('');
  const [execPath, setPath] = useState('');
  const [icon, setIcon]     = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name     || '');
      setPath(initial?.execPath || '');
      setIcon(initial?.icon     || '');
    }
  }, [open, initial]);

  async function handlePickPath() {
    const p = await window.api.openFolderPicker();
    if (p) setPath(p);
  }

  function handleSave() {
    if (!name.trim() || !execPath.trim()) return;
    onSave({ name: name.trim(), execPath: execPath.trim(), icon: icon.trim() || undefined });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.6)' }}
          />

          <motion.div
            className="absolute z-50 left-4 right-4 rounded-xl border p-5"
            style={{ top: '50%', translateY: '-50%', background: 'var(--surface-3)', borderColor: 'var(--border-default)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="text-sm font-semibold mb-4 text-text-primary">
              {initial ? 'Edit App' : 'Add App'}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-text-muted">
                  Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="App name"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-text-muted">
                  Path
                </label>
                <div className="flex gap-2">
                  <input
                    value={execPath}
                    onChange={e => setPath(e.target.value)}
                    placeholder="/path/to/app"
                    className="flex-1 px-3 py-2 rounded text-sm outline-none"
                    style={inputStyle}
                  />
                  <button
                    onClick={handlePickPath}
                    className="px-3 py-2 rounded text-sm transition-colors hover:bg-white/10 text-text-secondary border border-border-default"
                  >
                    …
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1 text-text-muted">
                  Icon (emoji)
                </label>
                <input
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  placeholder="🔧"
                  className="w-20 px-3 py-2 rounded text-sm outline-none text-center"
                  style={inputStyle}
                  maxLength={4}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {initial && onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-2 rounded text-sm transition-colors"
                  style={{ background: 'var(--sev-critical-bg)', color: 'var(--sev-critical)', border: '1px solid rgba(248,81,73,.3)' }}
                >
                  Delete
                </button>
              )}
              <div className="flex-1 flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded text-sm transition-colors hover:bg-white/10 border border-border-default text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !execPath.trim()}
                  className="px-4 py-2 rounded text-sm font-medium disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
                >
                  {initial ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
