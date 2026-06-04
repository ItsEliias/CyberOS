// Feature 8: CredVault bidirectional sync
import { useState } from 'react';
import { useSecretStore } from '../../stores/useSecretStore';

interface SyncPreview {
  alreadyInVault: number;
  newToPush: number;
  entries: Array<{ id: string; maskedValue: string; filePath: string }>;
}

export default function CredVaultSync() {
  const { secrets, activeRepoId, addAuditEntry, currentUser } = useSecretStore();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [pushed, setPushed] = useState(false);
  const [error, setError] = useState('');

  async function loadPreview() {
    setLoading(true); setError(''); setPushed(false);
    try {
      const res = await window.electronAPI.credvaultRead();
      if (res.error) { setError(res.error); setLoading(false); return; }
      const vaultData = res.data as Record<string, unknown> ?? {};
      const vaultValues = new Set(
        Object.values(vaultData).map((v) => String(v).toLowerCase())
      );
      const repoSecrets = secrets.filter((s) => s.repoId === (activeRepoId ?? ''));
      const newOnes = repoSecrets.filter((s) => !vaultValues.has(s.maskedValue.toLowerCase()));
      setPreview({
        alreadyInVault: repoSecrets.length - newOnes.length,
        newToPush: newOnes.length,
        entries: newOnes.map((s) => ({ id: s.id, maskedValue: s.maskedValue, filePath: s.filePath })),
      });
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }

  async function pushToCredVault() {
    if (!preview) return;
    setLoading(true);
    const res = await window.electronAPI.credvaultPush(preview.entries);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    addAuditEntry({
      timestamp: new Date().toISOString(), action: 'export', user: currentUser,
      detail: `Pushed ${preview.newToPush} secrets to CredVault`,
    });
    setPushed(true);
    setPreview(null);
  }

  return (
    <div className="p-4 space-y-4 max-w-lg">
      <div className="text-[10px] uppercase tracking-wider" style={{ color: '#3fb950' }}>CredVault Sync</div>

      {error && (
        <div className="px-3 py-2 rounded border text-xs" style={{ background: 'rgba(248,81,73,0.08)', borderColor: '#f85149', color: '#f85149' }}>
          {error}
        </div>
      )}

      {pushed && (
        <div className="px-3 py-2 rounded border text-xs" style={{ background: 'rgba(63,185,80,0.08)', borderColor: '#3fb950', color: '#3fb950' }}>
          Secrets pushed to CredVault successfully.
        </div>
      )}

      {!preview ? (
        <div className="space-y-3">
          <p className="text-[11px]" style={{ color: '#8b949e' }}>
            Match detected secrets against CredVault credentials. Preview before pushing.
          </p>
          <button onClick={loadPreview} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: '#3fb950', color: '#fff' }}>
            {loading ? 'Loading…' : 'Load Preview'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="px-3 py-3 rounded-lg border text-center"
              style={{ background: 'rgba(63,185,80,0.06)', borderColor: '#2a3347' }}>
              <div className="text-xl font-bold font-mono" style={{ color: '#3fb950' }}>
                {preview.alreadyInVault}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: '#8b949e' }}>already in CredVault</div>
            </div>
            <div className="px-3 py-3 rounded-lg border text-center"
              style={{ background: 'rgba(210,153,34,0.06)', borderColor: '#2a3347' }}>
              <div className="text-xl font-bold font-mono" style={{ color: '#d29922' }}>
                {preview.newToPush}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: '#8b949e' }}>new secrets to push</div>
            </div>
          </div>

          {preview.entries.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
              {preview.entries.map((e) => (
                <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] font-mono"
                  style={{ background: '#161b27', borderColor: '#2a3347' }}>
                  <span className="truncate" style={{ color: '#8b949e' }}>
                    {e.filePath.split('/').pop()}
                  </span>
                  <span className="ml-auto shrink-0" style={{ color: '#e6edf3' }}>{e.maskedValue}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setPreview(null)}
              className="flex-1 py-2 rounded-lg text-sm border transition-all hover:bg-white/5"
              style={{ borderColor: '#2a3347', color: '#8b949e' }}>Cancel</button>
            <button onClick={pushToCredVault} disabled={loading || preview.newToPush === 0}
              className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: '#3fb950', color: '#fff' }}>
              {loading ? 'Pushing…' : `Push ${preview.newToPush} Secrets`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
