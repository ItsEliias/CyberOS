// Feature 17: Backup export/import — AES-256 encrypted JSON
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecretStore } from '../../stores/useSecretStore';

interface Props {
  onClose: () => void;
}

async function sha256(val: string): Promise<string> {
  const enc = new TextEncoder().encode(val);
  const buf = await window.crypto.subtle.digest('SHA-256', enc);
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16) + '…';
}

export default function BackupModal({ onClose }: Props) {
  const { secrets, addAuditEntry, currentUser } = useSecretStore();
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  async function handleExport() {
    if (!password) { setStatus('Password required'); return; }
    if (password !== confirm) { setStatus('Passwords do not match'); return; }
    setWorking(true); setStatus('');
    // Strip raw values — export metadata with SHA256 of masked value only
    const exportPayload = await Promise.all(secrets.map(async s => ({
      id: s.id, repoId: s.repoId, filePath: s.filePath, lineNumber: s.lineNumber,
      patternType: s.patternType, valueHash: await sha256(s.maskedValue),
      environment: s.environment, secretType: s.secretType,
      entropy: s.entropy, expiresAt: s.expiresAt, comment: s.comment,
      referenceUrl: s.referenceUrl, tags: s.tags, rotationHistory: s.rotationHistory,
    })));
    const res = await window.electronAPI.exportBackup(exportPayload, password);
    setWorking(false);
    if (res.canceled) { setStatus('Cancelled'); return; }
    if (res.error) { setStatus('Error: ' + res.error); return; }
    addAuditEntry({ timestamp: new Date().toISOString(), action: 'export', user: currentUser, detail: `Exported ${secrets.length} secrets to ${res.filePath?.split('/').pop()}` });
    setStatus(`Backup saved: ${res.filePath?.split('/').pop()}`);
  }

  async function handleImport() {
    if (!password) { setStatus('Password required'); return; }
    setWorking(true); setStatus('');
    const res = await window.electronAPI.importBackup(password);
    setWorking(false);
    if (res.canceled) { setStatus('Cancelled'); return; }
    if (res.error) { setStatus('Error: ' + res.error); return; }
    addAuditEntry({ timestamp: new Date().toISOString(), action: 'import', user: currentUser, detail: 'Imported backup' });
    setStatus('Backup imported successfully');
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}>
        <motion.div className="w-full max-w-md rounded-xl border overflow-hidden"
          style={{ background: '#0f1117', borderColor: '#2a3347' }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a3347' }}>
            <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Backup Manager</span>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" style={{ color: '#8b949e' }}>×</button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#2a3347' }}>
              {(['export', 'import'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setStatus(''); setPassword(''); setConfirm(''); }}
                  className="flex-1 py-2 text-xs capitalize transition-all"
                  style={{ background: mode === m ? 'var(--accent)' : '#161b27', color: mode === m ? '#fff' : '#8b949e' }}>
                  {m}
                </button>
              ))}
            </div>

            {mode === 'export' && (
              <div className="text-[11px] space-y-1" style={{ color: '#8b949e' }}>
                <div>Export <span style={{ color: '#3fb950' }}>{secrets.length} secrets</span> as AES-256 encrypted backup.</div>
                <div>Raw values are NOT included — only SHA256 hashes of masked values.</div>
              </div>
            )}

            <div>
              <div className="text-[10px] mb-1" style={{ color: '#8b949e' }}>Backup Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter backup password"
                className="w-full px-3 py-2 rounded-lg text-xs border outline-none font-mono"
                style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }} />
            </div>

            {mode === 'export' && (
              <div>
                <div className="text-[10px] mb-1" style={{ color: '#8b949e' }}>Confirm Password</div>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none font-mono"
                  style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }} />
              </div>
            )}

            {status && (
              <div className="text-xs px-3 py-2 rounded" style={{ background: status.startsWith('Error') ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.1)', color: status.startsWith('Error') ? '#f85149' : '#3fb950' }}>
                {status}
              </div>
            )}

            <button onClick={mode === 'export' ? handleExport : handleImport}
              disabled={working || !password}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              {working ? '…' : mode === 'export' ? 'Export Backup' : 'Import Backup'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
