// CredVault — IPC handlers + crypto orchestration
// All AES-256-GCM and PBKDF2 operations run here via cryptoManager.
// The renderer never receives raw keys or master passwords.

import { ipcMain, clipboard, dialog, BrowserWindow, systemPreferences, safeStorage } from 'electron'
import fs from 'fs'
import os from 'os'
import { sharedConfigPath, userDataDir } from '../platform'
import path from 'path'
import https from 'https'
import crypto from 'crypto'
import { emitEvent } from '../ecosystem-bus'
import {
  beginSession, endSession, refreshSession,
  generateTotpSecret, verifyTotp,
  generateRecoveryKey, verifyRecoveryKey, type RecoveryKey,
} from '../security'
import {
  saltExists, vaultExists,
  ensureAppDir,
  clearKey, hasKey,
  deriveAndStoreKey, deriveAndStoreKeyWithNewSalt,
  encryptVaultWithKey, decryptVaultWithPassword,
  encryptBackup, decryptBackup,
} from '../cryptoManager'
import type {
  VaultData, Credential, CredVaultStatus,
  UnlockResult, SearchResult, ExportBackupPayload, PendingCredential,
  BreachCheckResult
} from '../../shared/types'

const APP_VERSION       = '1.0.0'
const CYBERTOOLS_CONFIG = sharedConfigPath()
const APP_SUPPORT       = userDataDir('CredVault')
const PREFS_FILE        = path.join(APP_SUPPORT, 'prefs.json')

// ─── In-memory vault state ────────────────────────────────────────────────────
let vaultData: VaultData | null = null

// ─── Lockout state ────────────────────────────────────────────────────────────
let failedAttempts = 0
let lockedUntil   = 0

const LOCKOUT_AFTER   = 5
const LOCKOUT_SECONDS = 60

// ─── HIBP breach result cache (in-memory) ─────────────────────────────────────
const breachCache = new Map<string, { count: number; checkedAt: string }>()

// ─── Lock / idle timer ────────────────────────────────────────────────────────
let _lockTimer: NodeJS.Timeout | null = null
let _mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  _mainWindow = win
}

export function resetLockTimer(timeoutMs: number): void {
  if (_lockTimer) clearTimeout(_lockTimer)
  if (timeoutMs <= 0) return
  _lockTimer = setTimeout(() => lockVault('auto-lock timeout'), timeoutMs)
}

export function lockVault(reason: string): void {
  clearKey()
  vaultData = null
  if (_lockTimer) { clearTimeout(_lockTimer); _lockTimer = null }
  writeCredVaultStatus(true, 0)
  endSession()
  emitEvent('CredVault', 'vault:locked', { reason })
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send('vault:locked')
  }
}

// ─── Prefs helpers ────────────────────────────────────────────────────────────

interface Prefs {
  sortOrder?: string
  totp?: { enabled: boolean; secret?: string }
  recovery?: { hashHex: string; saltHex: string }
}

function readPrefs(): Prefs {
  try {
    if (fs.existsSync(PREFS_FILE)) return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'))
  } catch {}
  return {}
}

function writePrefs(p: Prefs): void {
  try {
    ensureAppDir()
    // Atomic — prefs holds the TOTP secret and recovery hash; a corrupt
    // write would lock the user out of 2FA + recovery on next launch.
    const tmp = `${PREFS_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(p, null, 2), 'utf8')
    fs.renameSync(tmp, PREFS_FILE)
  } catch {}
}

function getTotpEnabled(): boolean {
  return readPrefs().totp?.enabled === true
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Boundary validation ─────────────────────────────────────────────────────
// IPC handlers accept arbitrary JSON from the renderer. A malformed payload
// (null, array, wrong type) used to crash the main process with a TypeError
// because handlers assumed shape without checking. These guards keep all
// crashes inside the handler — the IPC contract returns a sane error/null
// instead of taking the whole vault process down.

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function isCredentialInput(v: unknown): v is Omit<Credential, 'id' | 'createdAt' | 'updatedAt'> {
  if (!isObject(v)) return false
  // `service` + `source` are the fields the rest of the code reads
  // unconditionally (emitEvent, stats, etc.). Other fields are optional.
  return isNonEmptyString(v.service) && isNonEmptyString(v.source)
}

function defaultVault(): VaultData {
  return { credentials: [], version: APP_VERSION }
}

function saveVault(): void {
  if (!hasKey() || !vaultData) return
  encryptVaultWithKey(JSON.stringify(vaultData))
}

function credCount(): number {
  return vaultData?.credentials.length ?? 0
}

function writeCredVaultStatus(locked: boolean, count: number): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch (_) {}
    }
    const status: CredVaultStatus = {
      active: true,
      lastActive: new Date().toISOString(),
      credentialCount: count,
      locked,
    }
    shared.credvault_status = status
    // Atomic — every sibling app polls this file every few seconds. A torn
    // write (process killed mid-flush, disk full) corrupts JSON suite-wide
    // and forces every running app back to the SSO lock screen.
    const tmp = `${CYBERTOOLS_CONFIG}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(shared, null, 2), 'utf8')
    fs.renameSync(tmp, CYBERTOOLS_CONFIG)
  } catch (e) {
    console.warn('[CredVault] status write failed:', (e as Error).message)
  }
}

function readPending(): PendingCredential[] {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return []
    const cfg = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
    return (cfg?.credvault_pending as PendingCredential[]) ?? []
  } catch {
    return []
  }
}

function writePending(items: PendingCredential[]): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch {}
    }
    shared.credvault_pending = items
    // Atomic — see writeCredVaultStatus for the same rationale; every CyberOS
    // app polls this file and a torn write corrupts SSO state suite-wide.
    const tmp = `${CYBERTOOLS_CONFIG}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(shared, null, 2), 'utf8')
    fs.renameSync(tmp, CYBERTOOLS_CONFIG)
  } catch (e) {
    console.warn('[CredVault] writePending failed:', (e as Error).message)
  }
}

// ─── HIBP k-Anonymity check ───────────────────────────────────────────────────

function hibpCheck(password: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)
    const req = https.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'CredVault/1.0' }
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        const lines = data.split('\n')
        for (const line of lines) {
          const [s, count] = line.split(':')
          if (s && s.trim().toUpperCase() === suffix) {
            resolve(parseInt(count?.trim() ?? '0', 10))
            return
          }
        }
        resolve(0)
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('HIBP request timed out')) })
  })
}

// ─── IPC handler registration ─────────────────────────────────────────────────

export function registerCredVaultHandlers(): void {

  // ── Auth ──────────────────────────────────────────────────────────────────

  ipcMain.handle('vault:needs-setup', () => !saltExists() || !vaultExists())

  ipcMain.handle('vault:setup', (_e, password: string, autoLockMs?: number): UnlockResult => {
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' }
    try {
      ensureAppDir()
      deriveAndStoreKeyWithNewSalt(password)
      vaultData = defaultVault()
      saveVault()
      writeCredVaultStatus(false, 0)
      // First-time setup → begin SSO session immediately so soft-locked apps
      // (GhostVault, VaultCore) recognise the new vault as unlocked.
      beginSession(autoLockMs ?? 0)
      // Arm the in-memory auto-lock timer so the vault key is cleared after
      // the configured idle window. Without this the freshly-set-up vault
      // would stay decrypted in CredVault's main process indefinitely.
      resetLockTimer(autoLockMs ?? 0)
      emitEvent('CredVault', 'vault:unlocked', {})
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('vault:unlock', (_e, password: string, autoLockMs?: number): UnlockResult => {
    const now = Date.now()
    if (now < lockedUntil) {
      const secs = Math.ceil((lockedUntil - now) / 1000)
      return { ok: false, error: `Too many failed attempts. Try again in ${secs}s`, lockoutSeconds: secs }
    }

    if (!saltExists()) return { ok: false, error: 'Vault not initialized' }

    const plaintext = decryptVaultWithPassword(password)
    if (plaintext === null) {
      failedAttempts++
      if (failedAttempts >= LOCKOUT_AFTER) {
        lockedUntil    = Date.now() + LOCKOUT_SECONDS * 1000
        failedAttempts = 0
        return { ok: false, error: `Vault locked for ${LOCKOUT_SECONDS} seconds`, lockoutSeconds: LOCKOUT_SECONDS }
      }
      return { ok: false, error: 'Incorrect password', attemptsLeft: LOCKOUT_AFTER - failedAttempts }
    }

    failedAttempts = 0
    deriveAndStoreKey(password)
    try {
      vaultData = JSON.parse(plaintext) as VaultData
    } catch {
      vaultData = defaultVault()
    }

    // If 2FA is enabled, defer the full session until the renderer submits a
    // valid TOTP code via `vault:totp-verify`. Otherwise begin the SSO session
    // immediately so other apps in the ecosystem can pick up the unlock.
    if (!getTotpEnabled()) {
      beginSession(autoLockMs ?? 0)
    }

    writeCredVaultStatus(false, credCount())
    emitEvent('CredVault', 'vault:unlocked', {})
    resetLockTimer(autoLockMs ?? 0)
    return { ok: true, twoFactorRequired: getTotpEnabled() }
  })

  ipcMain.handle('vault:lock', () => {
    lockVault('user request')
    return true
  })

  // ── 2FA (TOTP) ────────────────────────────────────────────────────────────

  ipcMain.handle('vault:totp-status', (): { enabled: boolean } => {
    return { enabled: getTotpEnabled() }
  })

  // Issue a fresh secret to display in the renderer. Not persisted until
  // confirmed via `vault:totp-confirm` with a valid 6-digit code.
  ipcMain.handle('vault:totp-setup', (): { secret: string; otpauthUri: string } => {
    return generateTotpSecret()
  })

  ipcMain.handle('vault:totp-confirm', (_e, secret: unknown, code: unknown): { ok: boolean; error?: string } => {
    if (!isNonEmptyString(secret) || !isNonEmptyString(code)) {
      return { ok: false, error: 'Missing secret or code' }
    }
    if (!verifyTotp(secret, code)) return { ok: false, error: 'Code did not verify — check your authenticator clock' }
    const p = readPrefs()
    p.totp = { enabled: true, secret }
    writePrefs(p)
    emitEvent('CredVault', 'credvault.security.twofactor.enabled', {})
    return { ok: true }
  })

  ipcMain.handle('vault:totp-disable', (_e, code: unknown): { ok: boolean; error?: string } => {
    const p = readPrefs()
    const secret = p.totp?.secret
    if (!secret) { p.totp = { enabled: false }; writePrefs(p); return { ok: true } }
    // Before this guard, an undefined/non-string code threw inside verifyTotp
    // and the IPC returned a confusing OpenSSL error to the user. An empty
    // string fell through to verifyTotp returning false → "Code did not
    // verify". Both should be the same clean "Missing code" path.
    if (!isNonEmptyString(code)) return { ok: false, error: 'Missing code' }
    if (!verifyTotp(secret, code)) return { ok: false, error: 'Code did not verify' }
    p.totp = { enabled: false }
    writePrefs(p)
    emitEvent('CredVault', 'credvault.security.twofactor.disabled', {})
    return { ok: true }
  })

  // Called after the password unlock when twoFactorRequired was returned.
  // Completes the SSO session on success.
  ipcMain.handle('vault:totp-verify', (_e, code: unknown, autoLockMs?: unknown): { ok: boolean; error?: string } => {
    if (!isNonEmptyString(code)) return { ok: false, error: 'Missing code' }
    const lockMs = typeof autoLockMs === 'number' ? autoLockMs : 0
    const secret = readPrefs().totp?.secret
    if (!secret) return { ok: false, error: 'TOTP not configured' }
    if (!verifyTotp(secret, code)) return { ok: false, error: 'Code did not verify' }
    beginSession(lockMs)
    // The matching vault:unlock path skipped resetLockTimer when 2FA was
    // pending; arm it here once the TOTP code is verified so the in-memory
    // vault key gets cleared on idle.
    resetLockTimer(lockMs)
    return { ok: true }
  })

  // ── Recovery key ──────────────────────────────────────────────────────────

  ipcMain.handle('vault:recovery-status', (): { configured: boolean } => {
    return { configured: !!readPrefs().recovery }
  })

  // Generates + stores the hash for later verification. The plaintext is
  // returned ONCE to the renderer for the user to record; we never see it again.
  ipcMain.handle('vault:recovery-generate', (): { display: string } => {
    const rk: RecoveryKey = generateRecoveryKey()
    const p = readPrefs()
    p.recovery = { hashHex: rk.hashHex, saltHex: rk.saltHex }
    writePrefs(p)
    emitEvent('CredVault', 'credvault.security.recovery.generated', {})
    return { display: rk.display }
  })

  ipcMain.handle('vault:recovery-verify', (_e, input: unknown): { ok: boolean } => {
    if (typeof input !== 'string' || input.length === 0) return { ok: false }
    const r = readPrefs().recovery
    if (!r) return { ok: false }
    try { return { ok: verifyRecoveryKey(input, r.hashHex, r.saltHex) } }
    catch { return { ok: false } }
  })

  // ── SSO state read (for activity feed / debugging) ────────────────────────

  ipcMain.handle('sso:refresh', (_e, autoLockMs: unknown) => {
    // Coerce non-numbers to 0 so refreshSession's expiresAt math (Date.now()
    // + autoLockMs) never produces an Invalid Date. A renderer bug passing
    // NaN here used to bake 'NaN' into the shared SSO state, breaking every
    // sibling app's session-validity check.
    const ms = typeof autoLockMs === 'number' && Number.isFinite(autoLockMs) ? autoLockMs : 0
    return refreshSession(ms)
  })

  ipcMain.handle('vault:change-password', (_e, currentPassword: unknown, newPassword: unknown): UnlockResult => {
    if (!hasKey()) return { ok: false, error: 'Vault is locked' }
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return { ok: false, error: 'Passwords must be strings' }
    }
    if (newPassword.length < 8) return { ok: false, error: 'New password must be at least 8 characters' }
    const plaintext = decryptVaultWithPassword(currentPassword)
    if (plaintext === null) return { ok: false, error: 'Current password is incorrect' }
    try {
      deriveAndStoreKeyWithNewSalt(newPassword)
      saveVault()
      // Issue a fresh SSO token so other apps stay in sync with the new key
      refreshSession(0)
      // Invalidate any saved Touch ID credential — the stored password now
      // refers to the old key and would silently fail on next biometric
      // unlock. The user can re-enable Touch ID with the new password.
      try {
        const touchIdFile = path.join(APP_SUPPORT, 'touch-id.enc')
        if (fs.existsSync(touchIdFile)) fs.unlinkSync(touchIdFile)
      } catch { /* ignore */ }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // ── Touch ID biometric unlock ─────────────────────────────────────────────

  ipcMain.handle('vault:touch-id-available', async (): Promise<boolean> => {
    try {
      return systemPreferences.canPromptTouchID()
    } catch {
      return false
    }
  })

  const TOUCHID_FILE = path.join(APP_SUPPORT, 'touch-id.enc')

  // Whether the user has previously enabled Touch ID + saved a password.
  ipcMain.handle('vault:touch-id-enabled', (): boolean => fs.existsSync(TOUCHID_FILE))

  // Enable Touch ID for an existing password. Verifies the password decrypts
  // the vault, prompts Touch ID for confirmation, then stores the password
  // encrypted via Electron safeStorage (backed by the macOS Keychain).
  ipcMain.handle('vault:touch-id-enable', async (_e, password: unknown): Promise<{ ok: boolean; error?: string }> => {
    if (typeof password !== 'string' || password.length === 0) {
      return { ok: false, error: 'Password required' }
    }
    try {
      if (!saltExists()) return { ok: false, error: 'Vault not initialised' }
      if (decryptVaultWithPassword(password) === null) {
        return { ok: false, error: 'Password did not verify against the vault' }
      }
      if (!safeStorage.isEncryptionAvailable()) {
        return { ok: false, error: 'System keychain unavailable for safeStorage' }
      }
      try {
        await systemPreferences.promptTouchID('Confirm Touch ID for CredVault')
      } catch {
        return { ok: false, error: 'Touch ID confirmation failed or was cancelled' }
      }
      ensureAppDir()
      // Atomic — a corrupt safeStorage blob would silently fail to decrypt
      // on next biometric unlock attempt, and the user would have to
      // toggle Touch ID off + back on to recover.
      const _touchTmp = `${TOUCHID_FILE}.tmp`
      fs.writeFileSync(_touchTmp, safeStorage.encryptString(password))
      fs.renameSync(_touchTmp, TOUCHID_FILE)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('vault:touch-id-disable', (): { ok: boolean } => {
    try { fs.unlinkSync(TOUCHID_FILE) } catch { /* ignore */ }
    return { ok: true }
  })

  // Renderer calls this on the lock screen. We prompt Touch ID; on success
  // we retrieve the saved password from safeStorage and run the same unlock
  // path the password form uses (so the vault is properly decrypted, SSO
  // session begins, 2FA flag is honoured, etc.).
  ipcMain.handle('vault:touch-id-prompt', async (_e, autoLockMs?: number): Promise<UnlockResult> => {
    if (!fs.existsSync(TOUCHID_FILE)) return { ok: false, error: 'Touch ID not enabled' }
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'System keychain unavailable' }
    try {
      await systemPreferences.promptTouchID('Unlock CredVault')
    } catch {
      return { ok: false, error: 'Touch ID failed or was cancelled' }
    }
    let password: string
    try {
      password = safeStorage.decryptString(fs.readFileSync(TOUCHID_FILE))
    } catch (e) {
      return { ok: false, error: `Could not retrieve saved password: ${(e as Error).message}` }
    }

    // Reuse the same unlock logic — but we cannot ipcMain.invoke ourselves,
    // so inline the relevant bits. Note: we deliberately skip the lockout
    // counter here since a successful Touch ID is itself proof of presence.
    if (!saltExists()) return { ok: false, error: 'Vault not initialised' }
    const plaintext = decryptVaultWithPassword(password)
    if (plaintext === null) {
      // Saved password no longer works — disable Touch ID so the user sees
      // a fresh state next time.
      try { fs.unlinkSync(TOUCHID_FILE) } catch { /* ignore */ }
      return { ok: false, error: 'Saved password is stale; Touch ID disabled' }
    }
    failedAttempts = 0
    deriveAndStoreKey(password)
    try { vaultData = JSON.parse(plaintext) as VaultData } catch { vaultData = defaultVault() }
    if (!getTotpEnabled()) beginSession(autoLockMs ?? 0)
    writeCredVaultStatus(false, credCount())
    emitEvent('CredVault', 'vault:unlocked', { method: 'touch-id' })
    resetLockTimer(autoLockMs ?? 0)
    return { ok: true, twoFactorRequired: getTotpEnabled() }
  })

  // ── Credentials CRUD ──────────────────────────────────────────────────────

  ipcMain.handle('vault:get-credentials', (): Credential[] => {
    if (!vaultData) return []
    return vaultData.credentials
  })

  ipcMain.handle('vault:add-credential', (_e, cred: unknown): Credential | null => {
    if (!vaultData || !hasKey()) return null
    if (!isCredentialInput(cred)) return null
    const now  = new Date().toISOString()
    const full: Credential = { ...cred, id: uid(), createdAt: now, updatedAt: now }
    vaultData.credentials.push(full)
    saveVault()
    writeCredVaultStatus(false, credCount())
    emitEvent('CredVault', 'credential:added', { service: cred.service, source: cred.source })
    return full
  })

  ipcMain.handle('vault:update-credential', (_e, id: unknown, patch: unknown): boolean => {
    if (!vaultData || !hasKey()) return false
    if (!isNonEmptyString(id)) return false
    if (!isObject(patch)) return false
    const idx = vaultData.credentials.findIndex(c => c.id === id)
    if (idx === -1) return false
    // Whitelist patch — strip id/createdAt so a malicious renderer can't
    // overwrite identity fields or forge createdAt timestamps.
    const { id: _stripId, createdAt: _stripCreated, ...safePatch } = patch as Partial<Credential>
    vaultData.credentials[idx] = {
      ...vaultData.credentials[idx],
      ...safePatch,
      updatedAt: new Date().toISOString()
    }
    saveVault()
    return true
  })

  ipcMain.handle('vault:delete-credential', (_e, id: unknown): boolean => {
    if (!vaultData || !hasKey()) return false
    if (!isNonEmptyString(id)) return false
    const before = vaultData.credentials.length
    vaultData.credentials = vaultData.credentials.filter(c => c.id !== id)
    if (vaultData.credentials.length === before) return false
    saveVault()
    writeCredVaultStatus(false, credCount())
    return true
  })

  ipcMain.handle('vault:import-credentials', (_e, creds: unknown): number => {
    if (!vaultData || !hasKey()) return 0
    if (!Array.isArray(creds)) return 0
    const now  = new Date().toISOString()
    let added  = 0
    for (const c of creds) {
      if (!isCredentialInput(c)) continue
      vaultData.credentials.push({ ...c, id: uid(), createdAt: now, updatedAt: now })
      added++
    }
    saveVault()
    writeCredVaultStatus(false, credCount())
    if (added > 0) emitEvent('CredVault', 'credential:added', { count: added, source: 'import' })
    return added
  })

  // ── Usage tracking ────────────────────────────────────────────────────────

  ipcMain.handle('vault:record-usage', (_e, id: unknown): boolean => {
    if (!vaultData || !hasKey()) return false
    if (!isNonEmptyString(id)) return false
    const idx = vaultData.credentials.findIndex(c => c.id === id)
    if (idx === -1) return false
    const cred = vaultData.credentials[idx]
    vaultData.credentials[idx] = {
      ...cred,
      lastUsed:  new Date().toISOString(),
      useCount:  (cred.useCount ?? 0) + 1,
      updatedAt: new Date().toISOString()
    }
    saveVault()
    return true
  })

  // ── Stats ─────────────────────────────────────────────────────────────────

  ipcMain.handle('vault:get-stats', () => {
    if (!vaultData) return null
    const stats = {
      total: 0,
      byService: {} as Record<string, number>,
      byLab:     {} as Record<string, number>,
      bySource:  {} as Record<string, number>,
    }
    for (const c of vaultData.credentials) {
      stats.total++
      stats.byService[c.service] = (stats.byService[c.service] ?? 0) + 1
      if (c.labName)  stats.byLab[c.labName]    = (stats.byLab[c.labName]    ?? 0) + 1
      stats.bySource[c.source]   = (stats.bySource[c.source]   ?? 0) + 1
    }
    return stats
  })

  // ── Clipboard ─────────────────────────────────────────────────────────────

  ipcMain.handle('clipboard:copy-secure', (_e, text: unknown, clearAfterMs?: unknown): boolean => {
    if (typeof text !== 'string') return false
    try {
      clipboard.writeText(text)
      const ms = typeof clearAfterMs === 'number' ? clearAfterMs : 0
      if (ms > 0) {
        setTimeout(() => { clipboard.clear() }, ms)
      }
      return true
    } catch {
      return false
    }
  })

  // ── HIBP breach check ─────────────────────────────────────────────────────

  ipcMain.handle('vault:check-breach', async (_e, credId: unknown, password: unknown): Promise<BreachCheckResult> => {
    // hibpCheck hashes the password with sha1 — a non-string would throw
    // sync inside crypto. credId is used as a cache key, which would
    // silently coerce non-strings to '[object Object]'.
    if (!isNonEmptyString(credId) || typeof password !== 'string') {
      return { ok: false, error: 'Invalid credential id or password' }
    }
    const cached = breachCache.get(credId)
    // Return cache if checked within last hour
    if (cached) {
      const age = Date.now() - new Date(cached.checkedAt).getTime()
      if (age < 3_600_000) {
        return { ok: true, breachCount: cached.count, checkedAt: cached.checkedAt }
      }
    }
    try {
      const count = await hibpCheck(password)
      const checkedAt = new Date().toISOString()
      breachCache.set(credId, { count, checkedAt })
      return { ok: true, breachCount: count, checkedAt }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // ── Prefs ─────────────────────────────────────────────────────────────────

  ipcMain.handle('prefs:get', (): Record<string, unknown> => readPrefs())
  // Renderer-writable prefs keys. The previous unrestricted prefs:set let
  // the renderer overwrite *any* key in PREFS_FILE — including `totp`
  // (which would disable 2FA without the code) and `recovery` (which would
  // wipe out the recovery-key hash). It also accepted `__proto__` etc., a
  // classic prototype-pollution sink. Whitelist only the keys the renderer
  // legitimately controls.
  const ALLOWED_PREFS_KEYS = new Set(['sortOrder'])
  ipcMain.handle('prefs:set', (_e, key: unknown, value: unknown): boolean => {
    if (typeof key !== 'string' || !ALLOWED_PREFS_KEYS.has(key)) return false
    try {
      const p = readPrefs() as Record<string, unknown>
      p[key] = value
      writePrefs(p as { sortOrder?: string })
      return true
    } catch {
      return false
    }
  })

  // ── CSV import (process in main to avoid large data in renderer) ──────────
  // The renderer parses CSV itself (no Node needed) and calls vault:import-credentials.
  // Kept here as a direct file-open dialog helper.
  ipcMain.handle('vault:open-csv-file', async (): Promise<{ ok: boolean; content?: string; error?: string }> => {
    const win = BrowserWindow.getFocusedWindow()
    const { filePaths, canceled } = await dialog.showOpenDialog(win!, {
      title: 'Select CSV file to import',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return { ok: false, error: 'Cancelled' }
    try {
      const content = fs.readFileSync(filePaths[0], 'utf8')
      return { ok: true, content }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // ── ReconDesk ─────────────────────────────────────────────────────────────

  ipcMain.handle('recon:get-targets', (): unknown[] => {
    try {
      if (!fs.existsSync(CYBERTOOLS_CONFIG)) return []
      const cfg = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
      return (cfg?.recondesk_data?.targets ?? cfg?.targets ?? [])
    } catch {
      return []
    }
  })

  // ── Backup ────────────────────────────────────────────────────────────────

  ipcMain.handle('vault:export-backup', async (_e, payload: unknown): Promise<{ ok: boolean; error?: string }> => {
    if (!vaultData || !hasKey()) return { ok: false, error: 'Vault is locked' }
    if (!isObject(payload) || !isNonEmptyString(payload.exportPassword)) {
      return { ok: false, error: 'Export password required' }
    }
    const exportPassword = payload.exportPassword
    const win = BrowserWindow.getFocusedWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win!, {
      title: 'Export CredVault Backup',
      defaultPath: `credvault-backup-${new Date().toISOString().slice(0, 10)}.cvcrypt`,
      filters: [{ name: 'CredVault Backup', extensions: ['cvcrypt', 'cvault'] }],
    })
    if (canceled || !filePath) return { ok: false, error: 'Cancelled' }
    try {
      const encrypted = encryptBackup(JSON.stringify(vaultData), exportPassword)
      fs.writeFileSync(filePath, encrypted)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('vault:import-backup', async (_e, importPassword: unknown): Promise<{ ok: boolean; count?: number; error?: string }> => {
    if (!isNonEmptyString(importPassword)) {
      return { ok: false, error: 'Import password required' }
    }
    const win = BrowserWindow.getFocusedWindow()
    const { filePaths, canceled } = await dialog.showOpenDialog(win!, {
      title: 'Import CredVault Backup',
      filters: [{ name: 'CredVault Backup', extensions: ['cvcrypt', 'cvault'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return { ok: false, error: 'Cancelled' }
    try {
      const raw       = fs.readFileSync(filePaths[0])
      const plaintext = decryptBackup(raw, importPassword)
      if (!plaintext) return { ok: false, error: 'Incorrect backup password or corrupted file' }
      const backup = JSON.parse(plaintext) as VaultData
      if (!vaultData) return { ok: false, error: 'Vault is locked — unlock first' }
      // A malformed backup with credentials: null/undefined used to throw
      // 'is not iterable' inside the for-of, surfacing a confusing error.
      if (!Array.isArray(backup?.credentials)) {
        return { ok: false, error: 'Backup is missing a credentials array' }
      }
      let added = 0
      const now = new Date().toISOString()
      for (const c of backup.credentials) {
        if (!isCredentialInput(c) && !(isObject(c) && isNonEmptyString(c.id))) continue
        if (!vaultData.credentials.find(x => x.id === (c as Credential).id)) {
          vaultData.credentials.push({ ...(c as Credential), updatedAt: now })
          added++
        }
      }
      saveVault()
      writeCredVaultStatus(false, credCount())
      return { ok: true, count: added }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // ── Pending queue ─────────────────────────────────────────────────────────

  ipcMain.handle('pending:get', (): PendingCredential[] => readPending())

  ipcMain.handle('pending:approve', (_e, index: unknown): PendingCredential | null => {
    // `index` used to be 'number' but a renderer bug passing undefined
    // would fall through both bounds checks (undefined < 0 === false,
    // undefined >= n === false) and splice(undefined, 1) silently approves
    // the first item. Be explicit at the boundary.
    if (typeof index !== 'number' || !Number.isInteger(index)) return null
    const items = readPending()
    if (index < 0 || index >= items.length) return null
    const [approved] = items.splice(index, 1)
    writePending(items)
    return approved
  })

  ipcMain.handle('pending:dismiss', (_e, index: unknown): boolean => {
    if (typeof index !== 'number' || !Number.isInteger(index)) return false
    const items = readPending()
    if (index < 0 || index >= items.length) return false
    items.splice(index, 1)
    writePending(items)
    return true
  })

  // ── Misc ──────────────────────────────────────────────────────────────────

  ipcMain.handle('app:version', () => APP_VERSION)

  ipcMain.handle('vault:reset-idle-timer', (_e, autoLockMs: unknown) => {
    // Without this guard, a non-number autoLockMs (NaN, string) would
    // bypass resetLockTimer's `timeoutMs <= 0` check (NaN <= 0 === false)
    // and reach setTimeout(fn, NaN), which Node coerces to 0 — the vault
    // would lock immediately the next event-loop tick.
    if (!hasKey()) return true
    const ms = typeof autoLockMs === 'number' && Number.isFinite(autoLockMs) ? autoLockMs : 0
    resetLockTimer(ms)
    return true
  })

  // ── Cross-app credential query ────────────────────────────────────────────

  ipcMain.handle('credvault-search', (_e, query: unknown): SearchResult[] => {
    if (!vaultData) return []
    // Sibling apps (ReconDesk, NetworkMap) call this via the ecosystem bus.
    // A null payload used to crash on query.ip access — defend at the boundary.
    if (!isObject(query)) return []
    const ip         = typeof query.ip         === 'string' ? query.ip         : null
    const targetName = typeof query.targetName === 'string' ? query.targetName : null
    return vaultData.credentials
      .filter(c => {
        if (ip         && c.ip         === ip)         return true
        if (targetName && c.targetName === targetName) return true
        return false
      })
      .map(c => ({ id: c.id, service: c.service, username: c.username, ip: c.ip, targetName: c.targetName }))
  })

  // (previously: vault:write-status — removed. No preload bridge ever
  // exposed it to the renderer, so the IPC was unreachable dead code.)
}

export function isVaultLocked(): boolean {
  return vaultData === null || !hasKey()
}

export { writeCredVaultStatus, credCount, readPending, writePending }
