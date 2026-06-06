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
      setupVault:       (pw: string, autoLockMs?: number) => Promise<UnlockResult>
      unlockVault:      (pw: string, autoLockMs?: number) => Promise<UnlockResult>
      lockVault:        () => Promise<boolean>

      // Touch ID (biometric)
      touchIdAvailable: () => Promise<boolean>
      touchIdEnabled:   () => Promise<boolean>
      touchIdEnable:    (pw: string) => Promise<{ ok: boolean; error?: string }>
      touchIdDisable:   () => Promise<{ ok: boolean }>
      touchIdPrompt:    (autoLockMs?: number) => Promise<UnlockResult>
      changePassword:   (cur: string, next: string) => Promise<UnlockResult>

      // Two-factor (TOTP)
      totpStatus:       () => Promise<{ enabled: boolean }>
      totpSetup:        () => Promise<{ secret: string; otpauthUri: string }>
      totpConfirm:      (secret: string, code: string) => Promise<{ ok: boolean; error?: string }>
      totpDisable:      (code: string) => Promise<{ ok: boolean; error?: string }>
      totpVerify:       (code: string, autoLockMs?: number) => Promise<{ ok: boolean; error?: string }>

      // Recovery key
      recoveryStatus:   () => Promise<{ configured: boolean }>
      recoveryGenerate: () => Promise<{ display: string }>
      recoveryVerify:   (input: string) => Promise<{ ok: boolean }>

      // SSO session keep-alive
      ssoRefresh:       (autoLockMs: number) => Promise<unknown>

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

      // Tray-menu pending action (one-shot per launch)
      onPendingAction:  (cb: (action: string) => void) => () => void

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
