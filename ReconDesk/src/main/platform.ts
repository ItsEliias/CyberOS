// platform.ts — cross-platform shims for CyberOS apps.
// Each app gets its own copy because they're separate npm projects with
// independent node_modules; the file content is intentionally identical
// across apps so any change made here should be mirrored everywhere.

import { spawn } from 'child_process'
import { app, shell, systemPreferences, safeStorage } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'

/** True on Apple Silicon / Intel macOS. */
export function isMac(): boolean { return process.platform === 'darwin' }

/** True on Windows. */
export function isWindows(): boolean { return process.platform === 'win32' }

/** True on Linux / other Unixes. */
export function isLinux(): boolean { return !isMac() && !isWindows() }

/**
 * Path to where this app stores private state.
 *
 * On macOS we kept the historical `~/Library/Application Support/<App>` so
 * existing installs don't get orphaned. Linux + Windows use the standard
 * XDG / APPDATA locations.
 */
export function userDataDir(appName: string): string {
  if (isMac()) {
    return path.join(os.homedir(), 'Library', 'Application Support', appName)
  }
  if (isWindows()) {
    return path.join(process.env.APPDATA || os.homedir(), appName)
  }
  const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(xdgData, appName)
}

/**
 * Path to the shared CyberTools config file every app reads/writes.
 *
 * We deliberately keep the macOS layout (`~/cybertools-config.json`)
 * because every running app polls this exact path. Changing the location
 * mid-flight would split the ecosystem in two.
 */
export function sharedConfigPath(): string {
  if (isMac()) {
    return path.join(os.homedir(), 'cybertools-config.json')
  }
  if (isWindows()) {
    return path.join(process.env.APPDATA || os.homedir(), 'CyberTools', 'config.json')
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(xdgConfig, 'cybertools', 'config.json')
}

/**
 * Path to the shared ecosystem event bus.
 *
 * Mirrors the same per-platform pattern as the config file. The macOS path
 * is the historical canonical one; other platforms get the XDG/APPDATA
 * equivalent so the apps can co-exist.
 */
export function ecosystemBusPath(): string {
  if (isMac()) {
    return path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools', 'ecosystem-events.json')
  }
  if (isWindows()) {
    return path.join(process.env.APPDATA || os.homedir(), 'CyberTools', 'ecosystem-events.json')
  }
  const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(xdgData, 'cybertools', 'ecosystem-events.json')
}

/**
 * Open a path or URL with the OS default handler. Cross-platform replacement
 * for `spawn('open', [target])`.
 */
export function openExternally(target: string): void {
  // shell.openExternal already wraps the right thing per-OS for URLs and
  // for files — we still expose a spawn fallback below for parity with
  // the older sites that used spawn directly.
  void shell.openExternal(target).catch(() => undefined)
}

/**
 * Spawn the OS default handler with the given path. Use when the caller
 * needs detached process semantics rather than awaiting shell.openExternal.
 */
export function openInDefaultApp(target: string): void {
  let cmd: string
  let args: string[]
  if (isMac()) {
    cmd = 'open'; args = [target]
  } else if (isWindows()) {
    cmd = 'cmd'; args = ['/c', 'start', '""', target]
  } else {
    cmd = 'xdg-open'; args = [target]
  }
  try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref() } catch { /* ignore */ }
}

/**
 * Find a peer CyberOS app's executable on this machine, or null if not
 * installed. Falls back to checking known install locations per platform.
 *
 * `displayName` should be the product name as it appears in the OS install
 * (e.g. "CredVault", "CyberTools Launcher").
 */
export function peerAppPath(displayName: string): string | null {
  if (isMac()) {
    const p = `/Applications/${displayName}.app`
    return fs.existsSync(p) ? p : null
  }
  if (isWindows()) {
    const localApps = path.join(process.env.LOCALAPPDATA || os.homedir(), 'Programs', displayName)
    const exe = path.join(localApps, `${displayName}.exe`)
    return fs.existsSync(exe) ? exe : null
  }
  const slug = displayName.toLowerCase().replace(/\s+/g, '-')
  const candidates = [
    `/usr/local/bin/${slug}`,
    `/usr/bin/${slug}`,
    path.join(os.homedir(), '.local', 'bin', slug),
    `/opt/${slug}/${slug}`,
  ]
  return candidates.find(p => fs.existsSync(p)) ?? null
}

/**
 * Launch a peer CyberOS app by its product name. Returns false if the app
 * isn't installed.
 */
export function launchPeerApp(displayName: string): boolean {
  const target = peerAppPath(displayName)
  if (!target) return false
  openInDefaultApp(target)
  return true
}

/**
 * Detect if a VPN tunnel is currently active. Filters out macOS utun
 * link-local interfaces and Windows fe80:: hits so we don't false-positive.
 */
export function detectVpn(): { active: boolean; interface: string | null } {
  const ifaces = os.networkInterfaces()
  const patterns = ['tun', 'tap', 'vpn', 'proton', 'wg', 'ppp', 'utun', 'ipsec', 'ovpn', 'nord']
  for (const [name, addrs] of Object.entries(ifaces)) {
    const lo = name.toLowerCase()
    if (!patterns.some(p => lo.includes(p))) continue
    if (!addrs?.some(a => {
      if (a.internal) return false
      if (a.family === 'IPv6' && a.address.toLowerCase().startsWith('fe80')) return false
      if (a.family === 'IPv4' && a.address.startsWith('169.254.')) return false
      return true
    })) continue
    return { active: true, interface: name }
  }
  return { active: false, interface: null }
}

/** True if Touch ID / equivalent biometric is available on this OS. */
export function isBiometricAvailable(): boolean {
  if (!isMac()) return false
  try { return systemPreferences.canPromptTouchID() } catch { return false }
}

/** Prompt the user for biometric confirmation; resolves false on non-mac. */
export async function promptBiometric(reason: string): Promise<boolean> {
  if (!isMac()) return false
  try {
    await systemPreferences.promptTouchID(reason)
    return true
  } catch { return false }
}

/** True if Electron's safeStorage is available (Keychain / DPAPI / libsecret). */
export function isSafeStorageAvailable(): boolean {
  try { return safeStorage.isEncryptionAvailable() } catch { return false }
}

/**
 * macOS sometimes quarantines unsigned bundles after install. We can clear
 * the quarantine attribute on macOS only; on Linux/Windows the equivalent
 * doesn't exist and this is a no-op.
 */
export function clearQuarantine(targetPath: string): void {
  if (!isMac()) return
  try { spawn('xattr', ['-dr', 'com.apple.quarantine', targetPath], { stdio: 'ignore' }) } catch { /* ignore */ }
}

/** Convenience to silence the linter when `app` is otherwise unused. */
export const _appHandle = app
