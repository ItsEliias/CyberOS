import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LabCloseModalProps {
  labName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CHECKLIST_ITEMS = [
  { id: 'notes',    label: 'Notes saved to GhostVault' },
  { id: 'flags',    label: 'Flags captured in ReconDesk' },
  { id: 'target',   label: 'Target exported' },
  { id: 'report',   label: 'Report started in ReportForge' },
] as const;

export default function LabCloseModal({ labName, onConfirm, onCancel }: LabCloseModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        {/* Modal panel */}
        <motion.div
          key="modal"
          className="panel relative w-[400px] max-w-[90vw]"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg2)',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                marginBottom: '2px',
              }}
            >
              Close Lab
            </p>
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--accent)',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {labName}
            </h2>
          </div>

          {/* Body */}
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px' }}>
              Before closing, confirm:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {CHECKLIST_ITEMS.map(item => (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: '5px',
                    border: '1px solid var(--border)',
                    background: checked[item.id] ? 'var(--accent-dim)' : 'var(--bg3)',
                    transition: 'background 0.15s, border-color 0.15s',
                    borderColor: checked[item.id] ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => toggle(item.id)}
                    style={{ accentColor: 'var(--accent)', width: '14px', height: '14px', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: checked[item.id] ? 'var(--accent)' : 'var(--text-dim)',
                      transition: 'color 0.15s',
                    }}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg2)',
            }}
          >
            <button className="btn-ghost px-4 py-2 text-sm" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn-accent px-4 py-2 text-sm"
              style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
              onClick={onConfirm}
            >
              End Session
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
