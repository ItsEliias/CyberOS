// CredVault — cryptoManager.ts
// Key storage + PBKDF2 + AES-256-GCM operations in main process only.
// The derived key is a Buffer held in memory — never serialized or logged.

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { userDataDir } from './platform'

const APP_SUPPORT = userDataDir('CredVault')
const SALT_FILE   = path.join(APP_SUPPORT, 'salt.bin')
const VAULT_FILE  = path.join(APP_SUPPORT, 'vault.enc')

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH        = 32  // bytes (AES-256)
const IV_LENGTH         = 12  // bytes (GCM recommended)
const TAG_LENGTH        = 16  // bytes (GCM auth tag)
const SALT_LENGTH       = 32  // bytes

// ─── Module-level key storage — cleared on lock ───────────────────────────────
// Never persisted; lives only in Node.js process memory for the session.
let _sessionKey: Buffer | null = null

export function hasKey(): boolean {
  return _sessionKey !== null
}

export function clearKey(): void {
  if (_sessionKey) {
    // Overwrite buffer contents before releasing the reference
    _sessionKey.fill(0)
    _sessionKey = null
  }
}

// ─── App directory helpers ────────────────────────────────────────────────────

export function ensureAppDir(): void {
  if (!fs.existsSync(APP_SUPPORT)) fs.mkdirSync(APP_SUPPORT, { recursive: true })
}

export function saltExists(): boolean {
  return fs.existsSync(SALT_FILE)
}

export function vaultExists(): boolean {
  return fs.existsSync(VAULT_FILE)
}

// ─── Salt management ──────────────────────────────────────────────────────────

export function createSalt(): Buffer {
  ensureAppDir()
  const salt = crypto.randomBytes(SALT_LENGTH)
  // Atomic — corrupt salt = unrecoverable vault. Worth two extra syscalls.
  const _saltTmp = `${SALT_FILE}.tmp`
  fs.writeFileSync(_saltTmp, salt)
  fs.renameSync(_saltTmp, SALT_FILE)
  return salt
}

export function loadSalt(): Buffer {
  if (!fs.existsSync(SALT_FILE)) throw new Error('Salt file not found')
  return fs.readFileSync(SALT_FILE)
}

// ─── Key derivation ───────────────────────────────────────────────────────────

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

/**
 * Derive a key from the master password and store it in module memory.
 * Returns true on success, false if the salt file is missing.
 */
export function deriveAndStoreKey(password: string): boolean {
  try {
    const salt = loadSalt()
    clearKey()
    _sessionKey = deriveKey(password, salt)
    return true
  } catch {
    return false
  }
}

/**
 * Derive a key and store it, using a freshly created salt.
 * Call this only during first-time setup.
 */
export function deriveAndStoreKeyWithNewSalt(password: string): void {
  const salt = createSalt()
  clearKey()
  _sessionKey = deriveKey(password, salt)
}

// ─── Vault encryption / decryption ───────────────────────────────────────────

/**
 * Encrypt `plaintext` with the stored session key and write vault.enc.
 * Throws if no key is loaded.
 */
export function encryptVaultWithKey(plaintext: string): void {
  if (!_sessionKey) throw new Error('No session key — vault is locked')
  ensureAppDir()

  const iv     = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', _sessionKey, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  // Wire format: [IV (12)] [Tag (16)] [Ciphertext (N)]
  const combined = Buffer.concat([iv, tag, encrypted])
  // Atomic write — a crash mid-fs.writeFileSync of vault.enc would leave a
  // half-encrypted file with a bad GCM tag, and decryption would fail on
  // next launch. The user would lose every saved credential. Write to a
  // sibling .tmp and rename to atomically replace vault.enc.
  const tmp = `${VAULT_FILE}.tmp`
  fs.writeFileSync(tmp, combined)
  fs.renameSync(tmp, VAULT_FILE)
}

/**
 * Decrypt vault.enc using the provided password (derives a fresh key to verify).
 * Does NOT update the stored session key — call deriveAndStoreKey separately.
 * Returns the plaintext string, or null if decryption fails (wrong password / corrupt file).
 */
export function decryptVaultWithPassword(password: string): string | null {
  if (!fs.existsSync(VAULT_FILE)) return null
  try {
    const salt = loadSalt()
    const key  = deriveKey(password, salt)
    return decryptWithKey(key)
  } catch {
    return null
  }
}

/**
 * Decrypt vault.enc using the currently stored session key.
 * Returns plaintext or null.
 */
export function decryptVaultWithStoredKey(): string | null {
  if (!_sessionKey) return null
  return decryptWithKey(_sessionKey)
}

function decryptWithKey(key: Buffer): string | null {
  if (!fs.existsSync(VAULT_FILE)) return null
  try {
    const combined = fs.readFileSync(VAULT_FILE)

    const iv         = combined.subarray(0, IV_LENGTH)
    const tag        = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)

    return decipher.update(ciphertext) + decipher.final('utf8')
  } catch {
    return null
  }
}

// ─── Backup encryption / decryption ──────────────────────────────────────────

/**
 * Encrypt `plaintext` with a freshly-derived key from `exportPassword`.
 * The backup salt is embedded in the output so it is self-contained.
 * Wire format: [salt (32)] [IV (12)] [Tag (16)] [Ciphertext (N)]
 */
export function encryptBackup(plaintext: string, exportPassword: string): Buffer {
  const salt   = crypto.randomBytes(SALT_LENGTH)
  const key    = deriveKey(exportPassword, salt)
  const iv     = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  return Buffer.concat([salt, iv, tag, encrypted])
}

/**
 * Decrypt a backup buffer using `exportPassword`.
 * Returns plaintext or null on failure.
 */
export function decryptBackup(data: Buffer, exportPassword: string): string | null {
  try {
    const salt       = data.subarray(0, SALT_LENGTH)
    const iv         = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag        = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    const key      = deriveKey(exportPassword, salt)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)

    return decipher.update(ciphertext) + decipher.final('utf8')
  } catch {
    return null
  }
}
