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
  encrypt?:    boolean;
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

  // Encryption password modal state — used both for backup and restore.
  const [pwOpen,    setPwOpen]    = useState<null | 'snapshot' | 'restore' | 'save-schedule'>(null);
  const [pwInput,   setPwInput]   = useState('');
  const [pwHasSaved,setPwHasSaved]= useState(false);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    window.api.backupHasSavedPassword().then(setPwHasSaved).catch(() => {});
  }, [backup?.encrypt]);

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

  async function backupNow(password?: string) {
    if (!backup?.folder) { setMsg({ ok: false, text: 'Pick a backup folder first.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await window.api.backupSnapshot(password);
      if (res && res.ok) {
        setMsg({ ok: true, text: `Snapshot saved: ${res.file?.split('/').pop() ?? 'snapshot'}${res.encrypted ? ' [encrypted]' : ''}` });
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

  async function importBackup(password?: string) {
    setImportBusy(true); setMsg(null);
    try {
      const res = await window.api.backupImport(password);
      if (res && res.ok) {
        setMsg({ ok: true, text: `Restored ${res.count ?? 0} config file(s). Relaunch affected apps.` });
      } else if (res && res.encrypted && !password) {
        // Encrypted backup detected — open the password modal in 'restore' mode
        setPwInput(''); setPwOpen('restore');
        setMsg(null);
      } else if (res && res.error) {
        setMsg({ ok: false, text: res.error });
      }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setImportBusy(false);
    }
  }

  function startBackup() {
    if (backup?.encrypt) {
      setPwInput(''); setPwOpen('snapshot');
    } else {
      void backupNow();
    }
  }

  function startImport() {
    // First pass with no password — main process tells us if it was encrypted.
    void importBackup();
  }

  async function confirmPasswordModal() {
    if (!pwInput || pwInput.length < 4) { setMsg({ ok: false, text: 'Password must be at least 4 characters' }); return; }
    const mode = pwOpen;
    setPwOpen(null);
    if (mode === 'snapshot') {
      await backupNow(pwInput);
    } else if (mode === 'restore') {
      await importBackup(pwInput);
    } else if (mode === 'save-schedule') {
      const ok = await window.api.backupSavePassword(pwInput);
      if (ok) { setPwHasSaved(true); setMsg({ ok: true, text: 'Password saved — scheduled backups will run encrypted.' }); }
      else    { setMsg({ ok: false, text: 'Could not save password — system keychain unavailable.' }); }
    }
    setPwInput('');
  }

  async function clearSavedPassword() {
    await window.api.backupClearPassword();
    setPwHasSaved(false);
    setMsg({ ok: true, text: 'Saved password cleared.' });
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

            {/* Encryption toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span style={{ fontSize: 11, color: '#e6edf3', fontWeight: 500 }}>Encrypt snapshots</span>
                <span style={{ fontSize: 10, color: '#6b7280' }}>
                  AES-256-GCM with PBKDF2 (200k iters). Files use the .cyberos-backup extension.
                </span>
              </div>
              <button onClick={() => onSave({ backup: { ...(backup || {}), encrypt: !backup?.encrypt } })}
                style={{
                  padding: '3px 10px', fontSize: 10, borderRadius: 6,
                  background: backup?.encrypt ? 'rgba(63,185,80,0.15)' : 'rgba(42,51,71,0.4)',
                  border: `1px solid ${backup?.encrypt ? 'rgba(63,185,80,0.4)' : 'rgba(42,51,71,0.6)'}`,
                  color: backup?.encrypt ? '#3fb950' : '#8b949e',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {backup?.encrypt ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Schedule */}
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Schedule
              </span>
              <div className="flex gap-1">
                {(['manual', 'daily', 'weekly'] as const).map(f => (
                  <button key={f}
                    onClick={() => onSave({ backup: { ...(backup || {}), frequency: f } })}
                    style={{
                      flex: 1, padding: '6px 8px', fontSize: 11, borderRadius: 6,
                      background: (backup?.frequency || 'manual') === f
                        ? 'rgba(210,153,34,0.15)' : 'rgba(13,14,24,0.5)',
                      border: `1px solid ${(backup?.frequency || 'manual') === f
                        ? 'rgba(210,153,34,0.4)' : 'rgba(42,51,71,0.6)'}`,
                      color: (backup?.frequency || 'manual') === f ? '#d29922' : '#8b949e',
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved password for scheduled encrypted backups */}
            {backup?.encrypt && (backup?.frequency === 'daily' || backup?.frequency === 'weekly') && (
              <div className="flex items-center justify-between gap-2"
                style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6,
                         background: 'rgba(13,14,24,0.5)', border: '1px solid rgba(42,51,71,0.5)' }}>
                <span style={{ color: pwHasSaved ? '#3fb950' : '#d29922' }}>
                  {pwHasSaved ? 'Password saved for scheduled backups' : 'Save password for scheduled backups'}
                </span>
                {pwHasSaved ? (
                  <button onClick={clearSavedPassword}
                    style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4,
                             background: 'transparent', border: '1px solid rgba(248,81,73,0.5)',
                             color: '#f85149', cursor: 'pointer' }}>
                    Clear
                  </button>
                ) : (
                  <button onClick={() => { setPwInput(''); setPwOpen('save-schedule'); }}
                    style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4,
                             background: 'rgba(210,153,34,0.2)', border: '1px solid rgba(210,153,34,0.4)',
                             color: '#d29922', cursor: 'pointer' }}>
                    Set
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button onClick={startBackup} disabled={busy || !backup?.folder}
                style={{ padding: '7px 14px', fontSize: 11, borderRadius: 6, fontWeight: 600,
                         background: '#d29922', border: 'none', color: '#0a0a0f',
                         cursor: (busy || !backup?.folder) ? 'not-allowed' : 'pointer',
                         opacity: (busy || !backup?.folder) ? 0.5 : 1 }}>
                {busy ? 'Snapshotting…' : 'Back up now'}
              </button>
              <button onClick={startImport} disabled={importBusy}
                style={{ padding: '7px 14px', fontSize: 11, borderRadius: 6,
                         background: 'rgba(42,51,71,0.4)', border: '1px solid rgba(42,51,71,0.6)',
                         color: '#e6edf3', cursor: importBusy ? 'not-allowed' : 'pointer' }}>
                {importBusy ? 'Restoring…' : 'Restore from file…'}
              </button>
            </div>

            {backup?.lastRun && (
              <span style={{ fontSize: 10, color: '#4a5568' }}>
                Last backup: {new Date(backup.lastRun).toLocaleString()}
                {backup.frequency && backup.frequency !== 'manual' && (
                  <> · next {backup.frequency} run when due</>
                )}
              </span>
            )}
          </>
        )}

        {/* Password modal */}
        {pwOpen && (
          <div onClick={() => setPwOpen(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,12,0.65)',
                     backdropFilter: 'blur(4px)', zIndex: 250,
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: 360, background: 'rgba(13,14,24,0.98)',
                       border: '1px solid rgba(42,51,71,0.6)', borderRadius: 12,
                       padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>
                {pwOpen === 'restore' ? 'Decrypt backup' : pwOpen === 'save-schedule' ? 'Save scheduled password' : 'Encrypt snapshot'}
              </span>
              <span style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.5 }}>
                {pwOpen === 'restore'
                  ? 'This backup is encrypted. Enter the password used to create it.'
                  : pwOpen === 'save-schedule'
                  ? 'Stored in the macOS keychain via Electron safeStorage. Used for daily/weekly auto-backups.'
                  : 'Used to derive an AES-256 key. Store this somewhere safe — you cannot recover the backup without it.'}
              </span>
              <input
                type="password"
                autoFocus
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmPasswordModal()}
                placeholder="Password"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6,
                         background: 'rgba(7,8,15,0.7)', color: '#e6edf3',
                         border: '1px solid rgba(42,51,71,0.6)', fontSize: 13,
                         fontFamily: 'JetBrains Mono, monospace' }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setPwOpen(null)}
                  style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6,
                           background: 'transparent', border: '1px solid rgba(42,51,71,0.6)',
                           color: '#8b949e', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmPasswordModal} disabled={pwInput.length < 4}
                  style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6, fontWeight: 600,
                           background: pwInput.length >= 4 ? '#d29922' : 'rgba(210,153,34,0.3)',
                           border: 'none', color: '#0a0a0f',
                           cursor: pwInput.length >= 4 ? 'pointer' : 'not-allowed' }}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
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
