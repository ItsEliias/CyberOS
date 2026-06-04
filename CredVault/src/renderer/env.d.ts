/// <reference types="vite/client" />

import type {
  Credential,
  UnlockResult,
  VaultStats,
  SearchResult,
  ExportBackupPayload,
  PendingCredential,
} from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      // Auth
      needsSetup:       () => Promise<boolean>
      setupVault:       (pw: string) => Promise<UnlockResult>
      unlockVault:      (pw: string, autoLockMs?: number) => Promise<UnlockResult>
      lockVault:        () => Promise<boolean>
      changePassword:   (cur: string, next: string) => Promise<UnlockResult>

      // Credentials CRUD
      getCredentials:   () => Promise<Credential[]>
      addCredential:    (c: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Credential | null>
      updateCredential: (id: string, patch: Partial<Credential>) => Promise<boolean>
      deleteCredential: (id: string) => Promise<boolean>
      importCredentials:(creds: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>

      // Stats
      getStats:         () => Promise<VaultStats | null>

      // Clipboard
      copySecure:       (text: string, clearAfterMs?: number) => Promise<boolean>

      // ReconDesk import
      getReconTargets:  () => Promise<unknown[]>

      // Backup
      exportBackup:     (payload: ExportBackupPayload) => Promise<{ ok: boolean; error?: string }>
      importBackup:     (importPassword: string) => Promise<{ ok: boolean; count?: number; error?: string }>

      // Meta
      getVersion:       () => Promise<string>
      resetIdleTimer:   (autoLockMs: number) => Promise<boolean>

      // Push events
      onVaultLocked:    (cb: () => void) => void
      offVaultLocked:   (cb: () => void) => void

      // Cross-app search
      credvaultSearch:  (q: { ip?: string; targetName?: string }) => Promise<SearchResult[]>

      // Live Queue — pending credentials from ReconDesk
      pending: {
        get:     () => Promise<PendingCredential[]>
        approve: (index: number) => Promise<PendingCredential | null>
        dismiss: (index: number) => Promise<boolean>
        on:      (cb: (count: number) => void) => void
        off:     (cb: (count: number) => void) => void
      }
    }
  }
}
