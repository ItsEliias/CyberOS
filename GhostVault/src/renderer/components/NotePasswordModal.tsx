import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  noteName: string;
  mode: 'lock' | 'unlock';
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function NotePasswordModal({ noteName, mode, onSubmit, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  function handleSubmit() {
    if (!password.trim()) { setError('Password required'); return; }
    if (mode === 'lock' && password !== confirm) { setError('Passwords do not match'); return; }
    onSubmit(password);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <motion.div
        className="fixed z-50 rounded-xl border p-6"
        style={{
          top: '50%', left: '50%', x: '-50%', y: '-50%', width: 360,
          background: 'var(--bg3)', borderColor: 'var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
          {mode === 'lock' ? 'Lock Note' : 'Unlock Note'}
        </div>
        <div className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>{noteName}</div>
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
            placeholder="Password"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          {mode === 'lock' && (
            <input
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
              placeholder="Confirm password"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          )}
          {error && <div className="text-xs" style={{ color: '#f85149' }}>{error}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#7bb8ff', color: '#0a0a0f' }}>
            {mode === 'lock' ? 'Lock' : 'Unlock'}
          </button>
        </div>
      </motion.div>
    </>
  );
}
