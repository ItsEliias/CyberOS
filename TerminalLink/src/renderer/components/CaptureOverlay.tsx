import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  imageData: string;
  onClose: () => void;
}

export default function CaptureOverlay({ imageData, onClose }: Props) {
  const [label,   setLabel]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState<{ path: string; destination: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input + ESC handler
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave(destination: 'ghostvault' | 'downloads') {
    if (saving) return;
    setSaving(true);
    try {
      const result = await window.electronAPI.saveCapture({ imageData, label, destination });
      if (result.ok) {
        setSaved({ path: result.path, destination });
      }
    } catch (e) {
      console.error('[CaptureOverlay] save error:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--accent)',
            borderRadius: 6,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            width: '90%',
            maxWidth: 660,
            maxHeight: '85vh',
            overflow: 'hidden',
          }}
        >
          {/* Title bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}>
              ⊡ Terminal Capture
            </span>
            <button
              onClick={onClose}
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                padding: '2px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                lineHeight: 1,
              }}
              title="Close (ESC)"
            >
              ✕
            </button>
          </div>

          {/* Preview */}
          <div style={{
            background: '#0a0e14',
            border: '1px solid var(--border)',
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 320,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}>
            <img
              src={imageData}
              alt="Terminal capture"
              style={{
                maxWidth: '100%',
                display: 'block',
                imageRendering: 'pixelated',
              }}
            />
          </div>

          {/* Saved confirmation */}
          {saved && (
            <div style={{
              fontSize: 11,
              color: 'var(--success)',
              background: 'rgba(0,255,65,0.08)',
              border: '1px solid rgba(0,255,65,0.3)',
              borderRadius: 3,
              padding: '6px 10px',
              wordBreak: 'break-all',
            }}>
              Saved to {saved.destination === 'ghostvault' ? 'GhostVault' : 'Downloads'}:{' '}
              <span style={{ color: 'var(--text-dim)' }}>{saved.path}</span>
            </div>
          )}

          {/* Annotation input */}
          {!saved && (
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave('ghostvault'); }}
              placeholder="Add a note about this finding..."
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                padding: '8px 10px',
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {saved ? (
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  fontSize: 12,
                  borderRadius: 3,
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSave('ghostvault')}
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '7px 0',
                    fontSize: 12,
                    borderRadius: 3,
                    background: saving ? 'var(--accent-dim)' : 'var(--accent)',
                    border: '1px solid var(--accent)',
                    color: '#0a0e14',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save to GhostVault Session'}
                </button>
                <button
                  onClick={() => handleSave('downloads')}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    fontSize: 12,
                    borderRadius: 3,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  Save to Downloads
                </button>
                <button
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    padding: '7px 12px',
                    fontSize: 12,
                    borderRadius: 3,
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--text-muted)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
