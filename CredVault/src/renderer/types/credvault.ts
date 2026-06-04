// CredVault — renderer-side type re-exports and UI-specific types
// Imports shared types from the main/renderer shared module and adds
// UI-only interfaces that never cross the IPC boundary.

export type {
  Credential,
  CredentialStatus,
  HashType,
  VaultData,
  VaultStats,
  UnlockResult,
  SearchResult,
  ReconTarget,
  ReconCredential,
  ImportPreviewRow,
  ImportHistoryEntry,
  ExportBackupPayload,
  PendingCredential,
  CredVaultStatus,
} from '../../shared/types'

// ─── UI-only types ────────────────────────────────────────────────────────────

/** Currently selected view in the main navigation sidebar */
export type ActiveView = 'vault' | 'import' | 'settings'

/** Strength band for the master-password strength meter */
export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
  pct: number
}

/** State shape for the clipboard countdown timer */
export interface ClipboardTimerState {
  credId: string | null
  secondsRemaining: number
}

/** Filter state for the credential table */
export interface CredentialFilters {
  searchQuery:  string
  filterTag:    string | null
  filterStatus: string | null
  filterSource: string | null
}

/** Sort options for the credential table */
export type CredentialSortOrder = 'newest' | 'oldest' | null

/** Notification toast levels */
export type ToastLevel = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id:      string
  level:   ToastLevel
  message: string
}
