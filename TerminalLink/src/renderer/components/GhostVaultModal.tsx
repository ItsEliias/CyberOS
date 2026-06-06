import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  text?: string;
  initialContent?: string;
  onClose: () => void;
}

export default function GhostVaultModal({ text, initialContent, onClose }: Props) {
  const content = text ?? initialContent ?? '';
  const [title,  setTitle]  = useState('Terminal Output');
  const [folder, setFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState<string | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await window.electronAPI.saveToGhostVault(title, content, folder || undefined);
      if (result.ok) {
        setSaved(result.path);
      } else {
        // Main rejected the save (folder escaped vault root, disk full, …).
        // Without surfacing this the user sees the modal sit there as if
        // nothing happened.
        setError('Save failed — folder may be invalid or disk unavailable.');
      }
    } catch (e) {
      console.error('[GhostVaultModal]', e);
      setError((e as Error).message || 'Save failed');
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
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{
            width: 420, background: 'var(--panel)',
            border: '1px solid var(--accent)', borderRadius: 6,
            padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)' }}>
              Save to GhostVault
            </span>
            <button onClick={onClose} style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>

          {saved ? (
            <div style={{ fontSize: 11, color: 'var(--success)', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 3, padding: '8px 10px', wordBreak: 'break-all' }}>
              Saved: {saved}
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Note title</label>
                <input
                  ref={inputRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={iStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Folder (optional)</label>
                <input
                  value={folder}
                  onChange={e => setFolder(e.target.value)}
                  placeholder="Leave blank to use active lab"
                  style={iStyle}
                />
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '6px 8px', maxHeight: 80, overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {content.slice(0, 200)}{content.length > 200 ? '…' : ''}
                </pre>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {saved ? (
              <button onClick={onClose} style={{ flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 3, background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer' }}>
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  style={{ flex: 2, padding: '7px 0', fontSize: 12, borderRadius: 3, background: 'var(--accent)', border: 'none', color: '#000', cursor: saving ? 'wait' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save to GhostVault'}
                </button>
                <button onClick={onClose} style={{ flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 3, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            )}
          </div>
          {error ? (
            <div style={{ fontSize: 11, color: '#ef4444', padding: '4px 0' }}>
              {error}
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const iStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 3, padding: '6px 8px', color: 'var(--text)', fontSize: 12,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
