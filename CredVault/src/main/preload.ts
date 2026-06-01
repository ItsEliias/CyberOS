// CredVault — preload.ts
// ItsEliias — contextBridge API surface

import { contextBridge, ipcRenderer } from 'electron'
import type { Credential, UnlockResult, VaultStats, SearchResult, ExportBackupPayload, PendingCredential } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // Vault auth
  needsSetup:      (): Promise<boolean>                                => ipcRenderer.invoke('vault:needs-setup'),
  setupVault:      (pw: string): Promise<UnlockResult>                 => ipcRenderer.invoke('vault:setup', pw),
  unlockVault:     (pw: string, autoLockMs?: number): Promise<UnlockResult> => ipcRenderer.invoke('vault:unlock', pw, autoLockMs),
  lockVault:       (): Promise<boolean>                                => ipcRenderer.invoke('vault:lock'),
  changePassword:  (cur: string, next: string): Promise<UnlockResult>  => ipcRenderer.invoke('vault:change-password', cur, next),

  // Credentials CRUD
  getCredentials:  (): Promise<Credential[]>                           => ipcRenderer.invoke('vault:get-credentials'),
  addCredential:   (c: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credential | null>
    => ipcRenderer.invoke('vault:add-credential', c),
  updateCredential:(id: string, patch: Partial<Credential>): Promise<boolean>
    => ipcRenderer.invoke('vault:update-credential', id, patch),
  deleteCredential:(id: string): Promise<boolean>                      => ipcRenderer.invoke('vault:delete-credential', id),
  importCredentials:(creds: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number>
    => ipcRenderer.invoke('vault:import-credentials', creds),

  // Stats
  getStats:        (): Promise<VaultStats | null>                      => ipcRenderer.invoke('vault:get-stats'),

  // Clipboard
  copySecure:      (text: string, clearAfterMs?: number): Promise<boolean>
    => ipcRenderer.invoke('clipboard:copy-secure', text, clearAfterMs),

  // ReconDesk import
  getReconTargets: (): Promise<unknown[]>                              => ipcRenderer.invoke('recon:get-targets'),

  // Backup
  exportBackup:    (payload: ExportBackupPayload): Promise<{ ok: boolean; error?: string }>
    => ipcRenderer.invoke('vault:export-backup', payload),
  importBackup:    (importPassword: string): Promise<{ ok: boolean; count?: number; error?: string }>
    => ipcRenderer.invoke('vault:import-backup', importPassword),

  // Meta
  getVersion:      (): Promise<string>                                 => ipcRenderer.invoke('app:version'),

  // Push events from main to renderer
  onVaultLocked:   (cb: () => void) => ipcRenderer.on('vault:locked', cb),
  offVaultLocked:  (cb: () => void) => ipcRenderer.removeListener('vault:locked', cb),

  // Cross-app search (for completeness, same-process use)
  credvaultSearch: (q: { ip?: string; targetName?: string }): Promise<SearchResult[]>
    => ipcRenderer.invoke('credvault-search', q),

  // Live Queue — pending credentials from ReconDesk
  pending: {
    get:     (): Promise<PendingCredential[]>           => ipcRenderer.invoke('pending:get'),
    approve: (index: number): Promise<PendingCredential | null> => ipcRenderer.invoke('pending:approve', index),
    dismiss: (index: number): Promise<boolean>          => ipcRenderer.invoke('pending:dismiss', index),
    on:      (cb: (count: number) => void) => ipcRenderer.on('push:pending-count', (_e, count) => cb(count)),
    off:     (cb: (count: number) => void) => ipcRenderer.removeListener('push:pending-count', (_e, count) => cb(count)),
  },
})
