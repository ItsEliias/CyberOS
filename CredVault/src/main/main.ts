// CredVault — main.ts
// ItsEliias // v1.0 — Electron main process

import { app, BrowserWindow, ipcMain, clipboard, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { emitEvent } from './ecosystem-bus'
import {
  saltExists, vaultExists, createSalt, loadSalt,
  encryptVault, decryptVault, encryptBackup, decryptBackup, ensureAppDir
} from './vault-crypto'
import type {
  VaultData, Credential, CredVaultStatus,
  UnlockResult, SearchResult, ExportBackupPayload
} from '../shared/types'

const APP_VERSION       = '1.0.0'
const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

// Session state — key never persisted after process exits
let sessionKey: string | null = null
let vaultData: VaultData | null = null
let mainWindow: BrowserWindow | null = null
let statusInterval: NodeJS.Timeout | null = null
let lockTimer: NodeJS.Timeout | null = null

// Lockout state
let failedAttempts = 0
let lockedUntil   = 0

const LOCKOUT_AFTER   = 5
const LOCKOUT_SECONDS = 60

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultVault(): VaultData {
  return { credentials: [], version: APP_VERSION }
}

function saveVault(): void {
  if (!sessionKey || !vaultData) return
  encryptVault(JSON.stringify(vaultData), sessionKey)
}

function writeStatus(locked: boolean, count: number): void {
  try {
    let shared: Record<string, unknown> = {}
    if (fs.existsSync(CYBERTOOLS_CONFIG)) {
      try { shared = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) } catch (_) {}
    }
    const status: CredVaultStatus = {
      active: true,
      lastActive: new Date().toISOString(),
      credentialCount: count,
      locked
    }
    shared.credvault_status = status
    fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8')
  } catch (e) {
    console.warn('[CredVault] status write failed:', (e as Error).message)
  }
}

function getCredCount(): number {
  return vaultData?.credentials.length ?? 0
}

function resetLockTimer(timeoutMs: number): void {
  if (lockTimer) clearTimeout(lockTimer)
  if (timeoutMs <= 0) return
  lockTimer = setTimeout(() => lockVault('auto-lock timeout'), timeoutMs)
}

function lockVault(reason: string): void {
  sessionKey = null
  vaultData  = null
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null }
  writeStatus(true, 0)
  emitEvent('CredVault', 'vault:locked', { reason })
  mainWindow?.webContents.send('vault:locked')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 750,
    minHeight: 500,
    backgroundColor: '#0e1117',
    title: 'CredVault',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers

ipcMain.handle('vault:needs-setup', () => !saltExists() || !vaultExists())

ipcMain.handle('vault:setup', (_e, password: string): UnlockResult => {
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' }
  try {
    ensureAppDir()
    createSalt()
    sessionKey = password
    vaultData  = defaultVault()
    saveVault()
    writeStatus(false, 0)
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

  try {
    loadSalt()
  } catch {
    return { ok: false, error: 'Vault not initialized' }
  }

  const plaintext = decryptVault(password)
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
  sessionKey = password
  try {
    vaultData = JSON.parse(plaintext) as VaultData
  } catch {
    vaultData = defaultVault()
  }

  writeStatus(false, getCredCount())
  emitEvent('CredVault', 'vault:unlocked', {})
  resetLockTimer(autoLockMs ?? 0)
  return { ok: true }
})

ipcMain.handle('vault:lock', () => {
  lockVault('user request')
  return true
})

ipcMain.handle('vault:change-password', (_e, currentPassword: string, newPassword: string): UnlockResult => {
  if (!sessionKey || sessionKey !== currentPassword) {
    return { ok: false, error: 'Current password is incorrect' }
  }
  if (newPassword.length < 8) return { ok: false, error: 'New password must be at least 8 characters' }
  try {
    sessionKey = newPassword
    saveVault()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

ipcMain.handle('vault:get-credentials', (): Credential[] => {
  if (!vaultData) return []
  return vaultData.credentials
})

ipcMain.handle('vault:add-credential', (_e, cred: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Credential | null => {
  if (!vaultData || !sessionKey) return null
  const now  = new Date().toISOString()
  const full: Credential = { ...cred, id: uid(), createdAt: now, updatedAt: now }
  vaultData.credentials.push(full)
  saveVault()
  writeStatus(false, getCredCount())
  emitEvent('CredVault', 'credential:added', { service: cred.service, source: cred.source })
  return full
})

ipcMain.handle('vault:update-credential', (_e, id: string, patch: Partial<Credential>): boolean => {
  if (!vaultData || !sessionKey) return false
  const idx = vaultData.credentials.findIndex(c => c.id === id)
  if (idx === -1) return false
  vaultData.credentials[idx] = { ...vaultData.credentials[idx], ...patch, updatedAt: new Date().toISOString() }
  saveVault()
  return true
})

ipcMain.handle('vault:delete-credential', (_e, id: string): boolean => {
  if (!vaultData || !sessionKey) return false
  const before = vaultData.credentials.length
  vaultData.credentials = vaultData.credentials.filter(c => c.id !== id)
  if (vaultData.credentials.length === before) return false
  saveVault()
  writeStatus(false, getCredCount())
  return true
})

ipcMain.handle('vault:import-credentials', (_e, creds: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>[]): number => {
  if (!vaultData || !sessionKey) return 0
  const now  = new Date().toISOString()
  let added  = 0
  for (const c of creds) {
    vaultData.credentials.push({ ...c, id: uid(), createdAt: now, updatedAt: now })
    added++
  }
  saveVault()
  writeStatus(false, getCredCount())
  if (added > 0) emitEvent('CredVault', 'credential:added', { count: added, source: 'import' })
  return added
})

ipcMain.handle('vault:get-stats', () => {
  if (!vaultData) return null
  const stats = {
    total: 0,
    byService: {} as Record<string, number>,
    byLab: {} as Record<string, number>,
    bySource: {} as Record<string, number>
  }
  for (const c of vaultData.credentials) {
    stats.total++
    stats.byService[c.service] = (stats.byService[c.service] ?? 0) + 1
    if (c.labName)  stats.byLab[c.labName]    = (stats.byLab[c.labName]    ?? 0) + 1
    stats.bySource[c.source] = (stats.bySource[c.source] ?? 0) + 1
  }
  return stats
})

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

ipcMain.handle('recon:get-targets', (): unknown[] => {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return []
    const cfg = JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8'))
    return (cfg?.recondesk_data?.targets ?? cfg?.targets ?? [])
  } catch {
    return []
  }
})

ipcMain.handle('vault:export-backup', async (_e, payload: ExportBackupPayload): Promise<{ ok: boolean; error?: string }> => {
  if (!vaultData || !sessionKey) return { ok: false, error: 'Vault is locked' }
  const win = BrowserWindow.getFocusedWindow()
  const { filePath, canceled } = await dialog.showSaveDialog(win!, {
    title: 'Export CredVault Backup',
    defaultPath: `credvault-backup-${new Date().toISOString().slice(0, 10)}.cvault`,
    filters: [{ name: 'CredVault Backup', extensions: ['cvault'] }]
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
    filters: [{ name: 'CredVault Backup', extensions: ['cvault'] }],
    properties: ['openFile']
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
    writeStatus(false, getCredCount())
    return { ok: true, count: added }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

// Cross-app IPC: other CyberOS apps can query credentials (non-sensitive fields only)
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

ipcMain.handle('app:version', () => APP_VERSION)

// App lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    writeStatus(true, 0)
    emitEvent('CredVault', 'app:launched', { version: APP_VERSION })

    statusInterval = setInterval(() => {
      writeStatus(sessionKey === null, getCredCount())
    }, 10_000)
  })

  app.on('window-all-closed', () => {
    if (statusInterval) clearInterval(statusInterval)
    if (lockTimer)      clearTimeout(lockTimer)
    lockVault('app closed')
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
