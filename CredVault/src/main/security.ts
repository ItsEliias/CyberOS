// CredVault — security extensions: SSO state broadcast, TOTP 2FA, recovery key.
// All helpers are self-contained — no extra deps. TOTP uses Node's built-in
// crypto for HMAC-SHA1 and our own base32 encoder/decoder.

import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

const CYBERTOOLS_CONFIG = path.join(os.homedir(), 'cybertools-config.json')

// ─── shared-config IO ──────────────────────────────────────────────────────────

function readShared(): Record<string, unknown> {
  try {
    if (!fs.existsSync(CYBERTOOLS_CONFIG)) return {}
    return JSON.parse(fs.readFileSync(CYBERTOOLS_CONFIG, 'utf8')) || {}
  } catch { return {} }
}

function writeShared(shared: Record<string, unknown>): void {
  try { fs.writeFileSync(CYBERTOOLS_CONFIG, JSON.stringify(shared, null, 2), 'utf8') }
  catch (e) { console.warn('[CredVault security] writeShared failed:', (e as Error).message) }
}

// ─── SSO state ────────────────────────────────────────────────────────────────
// The Launcher and any "sensitive" app can read shared.sso to know whether
// the user has an active CredVault session. The presence of `token` proves
// the state was written by an in-process CredVault (so a stale file can't
// silently unlock other apps after a reboot).

export interface SSOState {
  unlocked:   boolean
  unlockedAt: string | null    // ISO
  expiresAt:  string | null    // ISO
  token:      string | null    // random per-session
  source:     'credvault'
}

let _sessionToken: string | null = null

export function beginSession(autoLockMs: number): SSOState {
  _sessionToken = crypto.randomBytes(24).toString('hex')
  const now = Date.now()
  const expiresAt = autoLockMs > 0 ? new Date(now + autoLockMs).toISOString() : null
  const state: SSOState = {
    unlocked:   true,
    unlockedAt: new Date(now).toISOString(),
    expiresAt,
    token:      _sessionToken,
    source:     'credvault',
  }
  const shared = readShared()
  shared.sso = state
  writeShared(shared)
  return state
}

export function endSession(): SSOState {
  _sessionToken = null
  const state: SSOState = {
    unlocked:   false,
    unlockedAt: null,
    expiresAt:  null,
    token:      null,
    source:     'credvault',
  }
  const shared = readShared()
  shared.sso = state
  writeShared(shared)
  return state
}

export function refreshSession(autoLockMs: number): SSOState | null {
  if (!_sessionToken) return null
  const now = Date.now()
  const shared = readShared()
  const prev = (shared.sso as SSOState | undefined) || null
  // When the caller passes 0 and there is already an active expiry, preserve
  // it. Otherwise the change-password / token-rotation path would silently
  // clear auto-lock and the session would never expire.
  const expiresAt =
    autoLockMs > 0 ? new Date(now + autoLockMs).toISOString()
    : prev?.expiresAt ?? null
  const state: SSOState = {
    unlocked:   true,
    unlockedAt: prev?.unlockedAt || new Date(now).toISOString(),
    expiresAt,
    token:      _sessionToken,
    source:     'credvault',
  }
  shared.sso = state
  writeShared(shared)
  return state
}

// ─── Base32 (RFC 4648, no padding) ────────────────────────────────────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 0x1f]
  return out
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  const bytes: number[] = []
  let bits = 0, value = 0
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

// ─── TOTP (RFC 6238, SHA-1, 6-digit, 30s step) ────────────────────────────────

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8)  |
                (hmac[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

export function totp(secretB32: string, time = Date.now()): string {
  return hotp(base32Decode(secretB32), Math.floor(time / 30_000))
}

export function verifyTotp(secretB32: string, code: string, windowSteps = 1): boolean {
  const cleaned = code.replace(/\D/g, '')
  if (cleaned.length !== 6) return false
  const now = Date.now()
  for (let step = -windowSteps; step <= windowSteps; step++) {
    if (totp(secretB32, now + step * 30_000) === cleaned) return true
  }
  return false
}

export function generateTotpSecret(): { secret: string; otpauthUri: string } {
  const secret = base32Encode(crypto.randomBytes(20)) // 160 bits
  const issuer  = 'CredVault'
  const account = 'CyberOS Vault'
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` +
                     `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  return { secret, otpauthUri }
}

// ─── Recovery key (32 random bytes → 8 groups of 6 base32 chars) ──────────────

export interface RecoveryKey {
  display: string         // human-shown "ABCDEF-GHIJKL-..." groups
  hashHex: string         // pbkdf2 hash for verification
  saltHex: string
}

export function generateRecoveryKey(): RecoveryKey {
  const raw = crypto.randomBytes(30) // 240 bits → 48 base32 chars
  const b32 = base32Encode(raw)
  const display = (b32.match(/.{1,6}/g) || []).slice(0, 8).join('-')
  const salt = crypto.randomBytes(16)
  const hash = crypto.pbkdf2Sync(display, salt, 100_000, 32, 'sha256')
  return { display, hashHex: hash.toString('hex'), saltHex: salt.toString('hex') }
}

export function verifyRecoveryKey(input: string, hashHex: string, saltHex: string): boolean {
  const normalised = input.trim().toUpperCase().replace(/\s+/g, '')
  // Accept with or without dashes
  const withDashes = normalised.includes('-')
    ? normalised
    : (normalised.match(/.{1,6}/g) || []).join('-')
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.pbkdf2Sync(withDashes, salt, 100_000, 32, 'sha256')
  return crypto.timingSafeEqual(actual, expected)
}
