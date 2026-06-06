// CredVault — AES-256-GCM vault encryption
// ItsEliias — crypto operations only, no key/password logging

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

const APP_SUPPORT = path.join(os.homedir(), 'Library', 'Application Support', 'CredVault')
const SALT_FILE   = path.join(APP_SUPPORT, 'salt.bin')
const VAULT_FILE  = path.join(APP_SUPPORT, 'vault.enc')

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH        = 32
const IV_LENGTH         = 12
const TAG_LENGTH        = 16

export function ensureAppDir(): void {
  if (!fs.existsSync(APP_SUPPORT)) fs.mkdirSync(APP_SUPPORT, { recursive: true })
}

export function saltExists(): boolean {
  return fs.existsSync(SALT_FILE)
}

export function vaultExists(): boolean {
  return fs.existsSync(VAULT_FILE)
}

export function createSalt(): Buffer {
  ensureAppDir()
  const salt = crypto.randomBytes(32)
  fs.writeFileSync(SALT_FILE, salt)
  return salt
}

export function loadSalt(): Buffer {
  if (!fs.existsSync(SALT_FILE)) throw new Error('Salt file not found')
  return fs.readFileSync(SALT_FILE)
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

export function encryptVault(plaintext: string, password: string): void {
  ensureAppDir()
  const salt   = loadSalt()
  const key    = deriveKey(password, salt)
  const iv     = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  // Layout: [iv (12)] [tag (16)] [ciphertext (N)]
  const combined = Buffer.concat([iv, tag, encrypted])
  // Atomic write — see cryptoManager.encryptVaultWithKey for full rationale.
  const tmp = `${VAULT_FILE}.tmp`
  fs.writeFileSync(tmp, combined)
  fs.renameSync(tmp, VAULT_FILE)
}

export function decryptVault(password: string): string | null {
  if (!fs.existsSync(VAULT_FILE)) return null
  try {
    const salt     = loadSalt()
    const key      = deriveKey(password, salt)
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

export function encryptBackup(plaintext: string, exportPassword: string): Buffer {
  const salt   = crypto.randomBytes(32)
  const key    = deriveKey(exportPassword, salt)
  const iv     = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  // Layout: [salt (32)] [iv (12)] [tag (16)] [ciphertext (N)]
  return Buffer.concat([salt, iv, tag, encrypted])
}

export function decryptBackup(data: Buffer, exportPassword: string): string | null {
  try {
    const salt       = data.subarray(0, 32)
    const iv         = data.subarray(32, 32 + IV_LENGTH)
    const tag        = data.subarray(32 + IV_LENGTH, 32 + IV_LENGTH + TAG_LENGTH)
    const ciphertext = data.subarray(32 + IV_LENGTH + TAG_LENGTH)

    const key      = deriveKey(exportPassword, salt)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)

    return decipher.update(ciphertext) + decipher.final('utf8')
  } catch {
    return null
  }
}
