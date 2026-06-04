// CredVault — preload.ts
// ItsEliias — contextBridge API surface

import { contextBridge, ipcRenderer } from 'electron'
import type {
  Credential, UnlockResult, VaultStats, SearchResult,
  ExportBackupPayload, PendingCredential, BreachCheckResult
} from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // Vault auth
  needsSetup:      (): Promise<boolean>                                => ipcRenderer.invoke('vault:needs-setup'),
  setupVault:      (pw: string): Promise<UnlockResult>                 => ipcRenderer.invoke('vault:setup', pw),
  unlockVault:     (pw: string, autoLockMs?: number): Promise<UnlockResult> => ipcRenderer.invoke('vault:unlock', pw, autoLockMs),
  lockVault:       (): Promise<boolean>                                => ipcRenderer.invoke('vault:lock'),
  changePassword:  (cur: string, next: string): Promise<UnlockResult>  => ipcRenderer.invoke('vault:change-password', cur, next),

  // Touch ID / biometric
  touchIdAvailable:(): Promise<boolean>                                => ipcRenderer.invoke('vault:touch-id-available'),
  touchIdPrompt:   (): Promise<{ ok: boolean; error?: string }>        => ipcRenderer.invoke('vault:touch-id-prompt'),

  // Credentials CRUD
  getCredentials:  (): Promise<Credential[]>                           => ipcRenderer.invoke('vault:get-credentials'),
  addCredential:   (c: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('vault:add-credential', c) as Promise<Credential | null>,
  updateCredential:(id: string, patch: Partial<Credential>) => ipcRenderer.invoke('vault:update-credential', id, patch) as Promise<boolean>,
  deleteCredential:(id: string): Promise<boolean>                      => ipcRenderer.invoke('vault:delete-credential', id),
  importCredentials:(creds: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>[]) => ipcRenderer.invoke('vault:import-credentials', creds) as Promise<number>,
  recordUsage:     (id: string): Promise<boolean>                      => ipcRenderer.invoke('vault:record-usage', id),

  // Stats
  getStats:        (): Promise<VaultStats | null>                      => ipcRenderer.invoke('vault:get-stats'),

  // Clipboard
  copySecure:      (text: string, clearAfterMs?: number) => ipcRenderer.invoke('clipboard:copy-secure', text, clearAfterMs) as Promise<boolean>,

  // HIBP breach check
  checkBreach:     (credId: string, password: string): Promise<BreachCheckResult> => ipcRenderer.invoke('vault:check-breach', credId, password),

  // CSV file open dialog
  openCsvFile:     (): Promise<{ ok: boolean; content?: string; error?: string }> => ipcRenderer.invoke('vault:open-csv-file'),

  // Preferences
  prefsGet:        (): Promise<Record<string, unknown>>                => ipcRenderer.invoke('prefs:get'),
  prefsSet:        (key: string, value: unknown): Promise<boolean>     => ipcRenderer.invoke('prefs:set', key, value),

  // ReconDesk import
  getReconTargets: (): Promise<unknown[]>                              => ipcRenderer.invoke('recon:get-targets'),

  // Backup
  exportBackup:    (payload: ExportBackupPayload) => ipcRenderer.invoke('vault:export-backup', payload) as Promise<{ ok: boolean; error?: string }>,
  importBackup:    (importPassword: string) => ipcRenderer.invoke('vault:import-backup', importPassword) as Promise<{ ok: boolean; count?: number; error?: string }>,

  // Shell
  openExternal:    (url: string): Promise<void>                        => ipcRenderer.invoke('open-external', url),

  // Meta
  getVersion:      (): Promise<string>                                 => ipcRenderer.invoke('app:version'),
  resetIdleTimer:  (autoLockMs: number): Promise<boolean>              => ipcRenderer.invoke('vault:reset-idle-timer', autoLockMs),

  // Push events from main to renderer
  onVaultLocked:   (cb: () => void) => ipcRenderer.on('vault:locked', cb),
  offVaultLocked:  (cb: () => void) => ipcRenderer.removeListener('vault:locked', cb),

  // Cross-app search
  credvaultSearch: (q: { ip?: string; targetName?: string }) => ipcRenderer.invoke('credvault-search', q) as Promise<SearchResult[]>,

  // Live Queue — pending credentials from ReconDesk
  pending: {
    get:     (): Promise<PendingCredential[]>           => ipcRenderer.invoke('pending:get'),
    approve: (index: number): Promise<PendingCredential | null> => ipcRenderer.invoke('pending:approve', index),
    dismiss: (index: number): Promise<boolean>          => ipcRenderer.invoke('pending:dismiss', index),
    on:      (cb: (count: number) => void) => ipcRenderer.on('push:pending-count', (_e, count) => cb(count)),
    off:     (cb: (count: number) => void) => ipcRenderer.removeListener('push:pending-count', (_e, count) => cb(count)),
  },
})
