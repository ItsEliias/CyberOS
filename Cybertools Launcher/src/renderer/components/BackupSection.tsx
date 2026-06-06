// Launcher Settings — Backup & Cloud Sync sections.
// Backup is opt-in. On enable, the user picks a folder; "Backup now"
// writes a tar.gz snapshot of all CyberOS app configs to that folder.
// Cloud sync is shipped as an opt-in stub for now ("Coming soon").

import { useEffect, useState } from 'react';
import HelpTip from './ui/HelpTip';

interface BackupConfig {
  enabled?:    boolean;
  folder?:     string;
  lastRun?:    string;  // ISO
  frequency?:  'manual' | 'daily' | 'weekly';
}

interface CloudSyncConfig {
  enabled?:    boolean;
  provider?:   'icloud' | 'dropbox' | 'google';
}

interface Props {
  backup:    BackupConfig | undefined;
  cloud:     CloudSyncConfig | undefined;
  onSave:    (updates: Record<string, unknown>) => void;
}

export default function BackupSection({ backup, cloud, onSave }: Props) {
  const [busy,      setBusy]      = useState(false);
  const [importBusy,setImportBusy]= useState(false);
  const [msg,       setMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  async function pickFolder() {
    const picked = await window.api.openFolderPicker();
    if (typeof picked === 'string') {
      onSave({ backup: { ...(backup || {}), folder: picked } });
    }
  }

  async function toggleEnabled() {
    if (!backup?.enabled && !backup?.folder) {
      // Force the folder picker on enable
      const picked = await window.api.openFolderPicker();
      if (typeof picked !== 'string') return;
      onSave({ backup: { ...(backup || {}), enabled: true, folder: picked, frequency: backup?.frequency || 'manual' } });
    } else {
      onSave({ backup: { ...(backup || {}), enabled: !backup?.enabled } });
    }
  }

  async function backupNow() {
    if (!backup?.folder) { setMsg({ ok: false, text: 'Pick a backup folder first.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await window.api.backupSnapshot();
      if (res && res.ok) {
        setMsg({ ok: true, text: `Snapshot saved: ${res.file?.split('/').pop() ?? 'snapshot.tar.gz'}` });
        onSave({ backup: { ...(backup || {}), lastRun: new Date().toISOString() } });
      } else {
        setMsg({ ok: false, text: res?.error || 'Backup failed' });
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function importBackup() {
    setImportBusy(true); setMsg(null);
    try {
      const res = await window.api.backupImport();
      if (res && res.ok) {
        setMsg({ ok: true, text: `Restored ${res.count ?? 0} config file(s). Relaunch affected apps.` });
      } else if (res && res.error) {
        setMsg({ ok: false, text: res.error });
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setImportBusy(false);
    }
  }

  const enabled = !!backup?.enabled;

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Backup ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3 pb-4 border-b" style={{ borderColor: 'rgba(42,51,71,0.5)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: '#d29922', fontWeight: 700,
                           textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Backup
            </span>
            <HelpTip
              title="Backup"
              body="Snapshot every CyberOS app's config (CredVault, GhostVault, VaultCore, etc.) into a single .tar.gz in a folder you pick. Off by default. Use when moving to a new machine."
            />
          </div>
          <button onClick={toggleEnabled}
            style={{
              padding: '3px 10px', fontSize: 10, borderRadius: 6,
              background: enabled ? 'rgba(63,185,80,0.15)' : 'rgba(42,51,71,0.4)',
              border: `1px solid ${enabled ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.6)'}`,
              color: enabled ? '#3fb950' : '#8b949e',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {enabled && (
          <>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Backup folder
              </span>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6,
                              border: '1px solid rgba(42,51,71,0.6)', background: 'rgba(13,14,24,0.6)',
                              fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#8b949e',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {backup?.folder || '— not set —'}
                </div>
                <button onClick={pickFolder}
                  style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6,
                           border: '1px solid rgba(42,51,71,0.6)', background: 'rgba(13,14,24,0.6)',
                           color: '#e6edf3', cursor: 'pointer' }}>
                  Choose…
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={backupNow} disabled={busy || !backup?.folder}
                style={{ padding: '7px 14px', fontSize: 11, borderRadius: 6, fontWeight: 600,
                         background: '#d29922', border: 'none', color: '#0a0a0f',
                         cursor: (busy || !backup?.folder) ? 'not-allowed' : 'pointer',
                         opacity: (busy || !backup?.folder) ? 0.5 : 1 }}>
                {busy ? 'Snapshotting…' : 'Back up now'}
              </button>
              <button onClick={importBackup} disabled={importBusy}
                style={{ padding: '7px 14px', fontSize: 11, borderRadius: 6,
                         background: 'rgba(42,51,71,0.4)', border: '1px solid rgba(42,51,71,0.6)',
                         color: '#e6edf3', cursor: importBusy ? 'not-allowed' : 'pointer' }}>
                {importBusy ? 'Restoring…' : 'Restore from file…'}
              </button>
            </div>

            {backup?.lastRun && (
              <span style={{ fontSize: 10, color: '#4a5568' }}>
                Last backup: {new Date(backup.lastRun).toLocaleString()}
              </span>
            )}
          </>
        )}

        {msg && (
          <div style={{
            fontSize: 11, padding: '6px 10px', borderRadius: 6,
            background: msg.ok ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)',
            border: `1px solid ${msg.ok ? 'rgba(63,185,80,0.35)' : 'rgba(248,81,73,0.35)'}`,
            color: msg.ok ? '#3fb950' : '#f85149',
          }}>
            {msg.text}
          </div>
        )}
      </section>

      {/* ─── Cloud sync ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: '#d29922', fontWeight: 700,
                           textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Cloud sync
            </span>
            <HelpTip
              title="Cloud sync"
              body="Sync your CyberOS configs across machines via iCloud, Dropbox, or Google Drive. Strictly local until you opt in. Provider integrations are not yet built — toggle is opt-in only and will surface once available."
            />
          </div>
          <button onClick={() => onSave({ cloudSync: { ...(cloud || {}), enabled: !cloud?.enabled } })}
            style={{
              padding: '3px 10px', fontSize: 10, borderRadius: 6,
              background: cloud?.enabled ? 'rgba(63,185,80,0.15)' : 'rgba(42,51,71,0.4)',
              border: `1px solid ${cloud?.enabled ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.6)'}`,
              color: cloud?.enabled ? '#3fb950' : '#8b949e',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            {cloud?.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.55, marginTop: -4 }}>
          Strictly local for now. Toggling on records your intent; provider
          integration is coming.
        </p>

        {cloud?.enabled && (
          <div className="flex gap-2">
            {(['icloud', 'dropbox', 'google'] as const).map(p => (
              <button key={p}
                onClick={() => onSave({ cloudSync: { ...(cloud || {}), provider: p } })}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: 11,
                  background: cloud?.provider === p ? 'rgba(74,158,255,0.1)' : 'rgba(13,14,24,0.5)',
                  border: `1px solid ${cloud?.provider === p ? 'rgba(74,158,255,0.4)' : 'rgba(42,51,71,0.6)'}`,
                  color: cloud?.provider === p ? '#4a9eff' : '#8b949e',
                  cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {p === 'icloud' ? 'iCloud' : p}
              </button>
            ))}
          </div>
        )}
        {cloud?.enabled && (
          <p style={{ fontSize: 10, color: '#6b7280' }}>
            Provider selected: <strong>{cloud.provider ?? '—'}</strong>. Integration not yet shipped.
          </p>
        )}
      </section>
    </div>
  );
}
