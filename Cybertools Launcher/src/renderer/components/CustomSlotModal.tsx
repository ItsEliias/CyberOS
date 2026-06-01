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
          <motion.div className="absolute inset-0 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.6)' }} />

          <motion.div
            className="absolute z-50 left-4 right-4 rounded-xl border p-5"
            style={{ top: '50%', translateY: '-50%', background: 'var(--panel)', borderColor: 'var(--border)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              {initial ? 'Edit App' : 'Add App'}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1"
                  style={{ color: 'var(--text-dim)' }}>Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="App name"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1"
                  style={{ color: 'var(--text-dim)' }}>Path</label>
                <div className="flex gap-2">
                  <input
                    value={execPath}
                    onChange={e => setPath(e.target.value)}
                    placeholder="/path/to/app"
                    className="flex-1 px-3 py-2 rounded text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                  />
                  <button onClick={handlePickPath}
                    className="px-3 py-2 rounded text-sm transition-colors hover:bg-white/10"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    …
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1"
                  style={{ color: 'var(--text-dim)' }}>Icon (emoji)</label>
                <input
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  placeholder="🔧"
                  className="w-20 px-3 py-2 rounded text-sm outline-none text-center"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                  maxLength={4}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {initial && onDelete && (
                <button onClick={onDelete}
                  className="px-3 py-2 rounded text-sm transition-colors"
                  style={{ background: 'rgba(248,81,73,.15)', color: '#f85149', border: '1px solid rgba(248,81,73,.3)' }}>
                  Delete
                </button>
              )}
              <div className="flex-1 flex gap-2 justify-end">
                <button onClick={onClose}
                  className="px-4 py-2 rounded text-sm transition-colors hover:bg-white/10"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !execPath.trim()}
                  className="px-4 py-2 rounded text-sm font-medium disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
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
