// CredVault — IPC handlers + crypto orchestration
// All AES-256-GCM and PBKDF2 operations run here via cryptoManager.
// The renderer never receives raw keys or master passwords.

import { ipcMain, clipboard, dialog, BrowserWindow, systemPreferences } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import https from 'https'
import crypto from 'crypto'
import { emitEvent } from '../ecosystem-bus'
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
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')
const APP_SUPPORT       = path.join(os.homedir(), 'Library', 'Application Support', 'CredVault')
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
  emitEvent('CredVault', 'vault:locked', { reason })
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send('vault:locked')
  }
}

// ─── Prefs helpers ────────────────────────────────────────────────────────────

interface Prefs {
  sortOrder?: string
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
    fs.writeFileSync(PREFS_FILE, JSON.stringify(p, null, 2), 'utf8')
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
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
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
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
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
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

  ipcMain.handle('vault:setup', (_e, password: string): UnlockResult => {
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' }
    try {
      ensureAppDir()
      deriveAndStoreKeyWithNewSalt(password)
      vaultData = defaultVault()
      saveVault()
      writeCredVaultStatus(false, 0)
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

    writeCredVaultStatus(false, credCount())
    emitEvent('CredVault', 'vault:unlocked', {})
    resetLockTimer(autoLockMs ?? 0)
    return { ok: true }
  })

  ipcMain.handle('vault:lock', () => {
    lockVault('user request')
    return true
  })

  ipcMain.handle('vault:change-password', (_e, currentPassword: string, newPassword: string): UnlockResult => {
    if (!hasKey()) return { ok: false, error: 'Vault is locked' }
    if (newPassword.length < 8) return { ok: false, error: 'New password must be at least 8 characters' }
    const plaintext = decryptVaultWithPassword(currentPassword)
    if (plaintext === null) return { ok: false, error: 'Current password is incorrect' }
    try {
      deriveAndStoreKeyWithNewSalt(newPassword)
      saveVault()
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

  ipcMain.handle('vault:touch-id-unlock', async (_e, password: string, autoLockMs?: number): Promise<UnlockResult> => {
    try {
      await systemPreferences.promptTouchID('Unlock CredVault')
    } catch {
      return { ok: false, error: 'Touch ID authentication failed or was cancelled' }
    }
    // Touch ID succeeded — now unlock with stored password token
    return ipcMain.emit('vault:unlock', null as unknown as Electron.IpcMainEvent, password, autoLockMs)
      ? { ok: false, error: 'internal' }
      : { ok: false, error: 'internal' }
  })

  // We use a direct call path for touch-id since it needs to call the unlock logic
  // The renderer will call touch-id-prompt, get a success, then call unlockVault with stored token
  ipcMain.handle('vault:touch-id-prompt', async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      await systemPreferences.promptTouchID('Unlock CredVault')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message ?? 'Touch ID failed' }
    }
  })

  // ── Credentials CRUD ──────────────────────────────────────────────────────

  ipcMain.handle('vault:get-credentials', (): Credential[] => {
    if (!vaultData) return []
    return vaultData.credentials
  })

  ipcMain.handle('vault:add-credential', (_e, cred: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Credential | null => {
    if (!vaultData || !hasKey()) return null
    const now  = new Date().toISOString()
    const full: Credential = { ...cred, id: uid(), createdAt: now, updatedAt: now }
    vaultData.credentials.push(full)
    saveVault()
    writeCredVaultStatus(false, credCount())
    emitEvent('CredVault', 'credential:added', { service: cred.service, source: cred.source })
    return full
  })

  ipcMain.handle('vault:update-credential', (_e, id: string, patch: Partial<Credential>): boolean => {
    if (!vaultData || !hasKey()) return false
    const idx = vaultData.credentials.findIndex(c => c.id === id)
    if (idx === -1) return false
    vaultData.credentials[idx] = { ...vaultData.credentials[idx], ...patch, updatedAt: new Date().toISOString() }
    saveVault()
    return true
  })

  ipcMain.handle('vault:delete-credential', (_e, id: string): boolean => {
    if (!vaultData || !hasKey()) return false
    const before = vaultData.credentials.length
    vaultData.credentials = vaultData.credentials.filter(c => c.id !== id)
    if (vaultData.credentials.length === before) return false
    saveVault()
    writeCredVaultStatus(false, credCount())
    return true
  })

  ipcMain.handle('vault:import-credentials', (_e, creds: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>[]): number => {
    if (!vaultData || !hasKey()) return 0
    const now  = new Date().toISOString()
    let added  = 0
    for (const c of creds) {
      vaultData.credentials.push({ ...c, id: uid(), createdAt: now, updatedAt: now })
      added++
    }
    saveVault()
    writeCredVaultStatus(false, credCount())
    if (added > 0) emitEvent('CredVault', 'credential:added', { count: added, source: 'import' })
    return added
  })

  // ── Usage tracking ────────────────────────────────────────────────────────

  ipcMain.handle('vault:record-usage', (_e, id: string): boolean => {
    if (!vaultData || !hasKey()) return false
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

  ipcMain.handle('clipboard:copy-secure', (_e, text: string, clearAfterMs?: number): boolean => {
    try {
      clipboard.writeText(text)
      if (clearAfterMs && clearAfterMs > 0) {
        setTimeout(() => { clipboard.clear() }, clearAfterMs)
      }
      return true
    } catch {
      return false
    }
  })

  // ── HIBP breach check ─────────────────────────────────────────────────────

  ipcMain.handle('vault:check-breach', async (_e, credId: string, password: string): Promise<BreachCheckResult> => {
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
  ipcMain.handle('prefs:set', (_e, key: string, value: unknown): boolean => {
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

  ipcMain.handle('vault:export-backup', async (_e, payload: ExportBackupPayload): Promise<{ ok: boolean; error?: string }> => {
    if (!vaultData || !hasKey()) return { ok: false, error: 'Vault is locked' }
    const win = BrowserWindow.getFocusedWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win!, {
      title: 'Export CredVault Backup',
      defaultPath: `credvault-backup-${new Date().toISOString().slice(0, 10)}.cvcrypt`,
      filters: [{ name: 'CredVault Backup', extensions: ['cvcrypt', 'cvault'] }],
    })
    if (canceled || !filePath) return { ok: false, error: 'Cancelled' }
    try {
      const encrypted = encryptBackup(JSON.stringify(vaultData), payload.exportPassword)
      fs.writeFileSync(filePath, encrypted)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('vault:import-backup', async (_e, importPassword: string): Promise<{ ok: boolean; count?: number; error?: string }> => {
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
      let added = 0
      const now = new Date().toISOString()
      for (const c of backup.credentials) {
        if (!vaultData.credentials.find(x => x.id === c.id)) {
          vaultData.credentials.push({ ...c, updatedAt: now })
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

  ipcMain.handle('pending:approve', (_e, index: number): PendingCredential | null => {
    const items = readPending()
    if (index < 0 || index >= items.length) return null
    const [approved] = items.splice(index, 1)
    writePending(items)
    return approved
  })

  ipcMain.handle('pending:dismiss', (_e, index: number): boolean => {
    const items = readPending()
    if (index < 0 || index >= items.length) return false
    items.splice(index, 1)
    writePending(items)
    return true
  })

  // ── Misc ──────────────────────────────────────────────────────────────────

  ipcMain.handle('app:version', () => APP_VERSION)

  ipcMain.handle('vault:reset-idle-timer', (_e, autoLockMs: number) => {
    if (hasKey()) resetLockTimer(autoLockMs)
    return true
  })

  // ── Cross-app credential query ────────────────────────────────────────────

  ipcMain.handle('credvault-search', (_e, query: { ip?: string; targetName?: string }): SearchResult[] => {
    if (!vaultData) return []
    return vaultData.credentials
      .filter(c => {
        if (query.ip         && c.ip         === query.ip)         return true
        if (query.targetName && c.targetName === query.targetName) return true
        return false
      })
      .map(c => ({ id: c.id, service: c.service, username: c.username, ip: c.ip, targetName: c.targetName }))
  })

  // ── Status helpers exposed for main.ts ────────────────────────────────────

  ipcMain.handle('vault:write-status', (_e, locked: boolean) => {
    writeCredVaultStatus(locked, credCount())
    return true
  })
}

export { writeCredVaultStatus, credCount, readPending, writePending }
