/// <reference types="vite/client" />

import type { Credential, UnlockResult, VaultStats, SearchResult, ExportBackupPayload } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      needsSetup:       () => Promise<boolean>
      setupVault:       (pw: string) => Promise<UnlockResult>
      unlockVault:      (pw: string, autoLockMs?: number) => Promise<UnlockResult>
      lockVault:        () => Promise<boolean>
      changePassword:   (cur: string, next: string) => Promise<UnlockResult>

      getCredentials:   () => Promise<Credential[]>
      addCredential:    (c: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Credential | null>
      updateCredential: (id: string, patch: Partial<Credential>) => Promise<boolean>
      deleteCredential: (id: string) => Promise<boolean>
      importCredentials:(creds: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>

      getStats:         () => Promise<VaultStats | null>

      copySecure:       (text: string, clearAfterMs?: number) => Promise<boolean>

      getReconTargets:  () => Promise<unknown[]>

      exportBackup:     (payload: ExportBackupPayload) => Promise<{ ok: boolean; error?: string }>
      importBackup:     (importPassword: string) => Promise<{ ok: boolean; count?: number; error?: string }>

      getVersion:       () => Promise<string>

      onVaultLocked:    (cb: () => void) => void
      offVaultLocked:   (cb: () => void) => void

      credvaultSearch:  (q: { ip?: string; targetName?: string }) => Promise<SearchResult[]>
    }
  }
}
