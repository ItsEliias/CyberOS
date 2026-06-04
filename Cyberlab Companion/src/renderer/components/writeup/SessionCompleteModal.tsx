import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Session } from '@shared/types';
import { formatElapsed } from '../../lib/session';

interface SessionCompleteModalProps {
  session: Session;
  onComplete: (opts: { addToHistory: boolean; updateStreak: boolean; generateWriteup: boolean }) => void;
  onCancel: () => void;
}

function countFindings(session: Session): { ports: number; creds: number; flags: number; hints: number } {
  return {
    ports:  session.findings.ports.length,
    creds:  session.findings.credentials.length,
    flags:  session.findings.flags.length,
    hints:  session.hintsUsed || 0,
  };
}

export default function SessionCompleteModal({ session, onComplete, onCancel }: SessionCompleteModalProps) {
  const [addToHistory,   setAddToHistory]   = useState(true);
  const [updateStreak,   setUpdateStreak]   = useState(true);
  const [generateWriteup,setGenerateWriteup] = useState(true);

  const elapsed = session.timer?.elapsed ?? 0;
  const duration = formatElapsed(elapsed);
  const counts = countFindings(session);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        className="panel relative w-[460px] max-w-[92vw]"
        style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 18 }}>🏁</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Session Complete
            </span>
          </div>
          <div className="font-mono text-base font-bold truncate" style={{ color: 'var(--accent)' }}>
            {session.labName}
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Duration',    value: duration || '—',        color: 'var(--accent)' },
              { label: 'Platform',    value: session.platform,        color: 'var(--text-dim)' },
              { label: 'Ports found', value: String(counts.ports),   color: '#4a9eff' },
              { label: 'Credentials', value: String(counts.creds),   color: '#f85149' },
              { label: 'Flags',       value: String(counts.flags),   color: '#3fb950' },
              { label: 'Hints used',  value: String(counts.hints),   color: '#d29922' },
            ].map(s => (
              <div
                key={s.label}
                className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span className="text-xs font-semibold font-mono" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { key: 'addToHistory',    label: 'Add to Lab History',   checked: addToHistory,    set: setAddToHistory },
            { key: 'updateStreak',    label: 'Update Streak',        checked: updateStreak,    set: setUpdateStreak },
            { key: 'generateWriteup', label: 'Generate Writeup',     checked: generateWriteup, set: setGenerateWriteup },
          ].map(opt => (
            <label
              key={opt.key}
              className="flex items-center gap-3 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={opt.checked}
                onChange={e => opt.set(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
              />
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Buttons */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--bg2)' }}
        >
          <button className="btn-ghost px-5 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-accent px-5 py-2 text-sm"
            onClick={() => onComplete({ addToHistory, updateStreak, generateWriteup })}
          >
            Complete Session
          </button>
        </div>
      </motion.div>
    </div>
  );
}
