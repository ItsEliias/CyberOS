/**
 * ptyManager — TerminalLink
 * Manages a map of live node-pty instances keyed by pane ID.
 * All PTY operations go through this module so the main process
 * never leaks zombie processes.
 *
 * node-pty is a native module and MUST stay in the main process.
 * Use createRequire for ESM / native module compatibility.
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import process from 'process';
import os from 'os';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require  = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodePty   = _require('node-pty') as any;

// Allow-list of shells we will spawn. Anything else falls back to /bin/zsh.
// Includes the common system shells + a couple of well-known Homebrew paths.
// Order doesn't matter — membership test is O(n) but n is tiny.
const ALLOWED_SHELLS = new Set<string>([
  '/bin/zsh',
  '/bin/bash',
  '/bin/sh',
  '/bin/dash',
  '/bin/ksh',
  '/bin/tcsh',
  '/bin/csh',
  '/usr/bin/zsh',
  '/usr/bin/bash',
  '/usr/bin/sh',
  '/usr/local/bin/zsh',
  '/usr/local/bin/bash',
  '/usr/local/bin/fish',
  '/opt/homebrew/bin/zsh',
  '/opt/homebrew/bin/bash',
  '/opt/homebrew/bin/fish',
]);

/**
 * Validate a candidate shell path:
 *   1. must be in our allow-list (covers macOS defaults + Homebrew layouts)
 *      OR appear in /etc/shells, and
 *   2. must exist on disk as a regular executable file.
 *
 * Anything else returns null so the caller can fall back to a safe default.
 * Without this, a poisoned ~/cybertools-config.json could point shellPath
 * at a planted binary (~/.malicious-shell) and TerminalLink would launch it
 * the next time the user opens a pane.
 */
function sanitizeShellPath(candidate: string | undefined): string | null {
  if (!candidate || typeof candidate !== 'string') return null;
  // Reject shell metacharacters outright — they have no business in a path.
  if (/[;&|<>$`\n\r]/.test(candidate)) return null;
  if (!path.isAbsolute(candidate)) return null;
  const resolved = path.resolve(candidate);

  let allowed = ALLOWED_SHELLS.has(resolved);
  if (!allowed) {
    // Also accept entries from the system's /etc/shells if present.
    try {
      const lines = fs.readFileSync('/etc/shells', 'utf8').split('\n');
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        if (line === resolved) { allowed = true; break; }
      }
    } catch { /* ignore — /etc/shells may not be readable */ }
  }
  if (!allowed) return null;

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }
  return resolved;
}

/**
 * Strip env keys that can be abused to inject arbitrary code into the spawned
 * shell. The renderer is allowed to pass scratch env (TARGET, TARGET_IP, etc.)
 * but never the dynamic-linker overrides — they would let a renderer with
 * write access to ~/cybertools-config.json or a victim user load a poisoned
 * dylib into every spawned terminal.
 *
 * We strip from BOTH the renderer-supplied extras AND our own process.env on
 * the way through, because process.env itself can be tampered with by a
 * launching parent (e.g. an attacker spawning TerminalLink with DYLD_* set).
 */
function sanitizeEnv(input: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    // Block the macOS dyld override family and Linux LD_* equivalents.
    if (k.startsWith('DYLD_')) continue;
    if (k === 'LD_PRELOAD' || k === 'LD_LIBRARY_PATH' || k.startsWith('LD_AUDIT')) continue;
    out[k] = v;
  }
  return out;
}

export type PtyDataCallback = (id: string, data: string) => void;
export type PtyExitCallback = (id: string, code: number) => void;

// Shared callbacks — set once by ipc/terminallink.ts
let _onData: PtyDataCallback | null = null;
let _onExit: PtyExitCallback | null = null;

/** Install the callbacks used to forward PTY events to the renderer. */
export function setPtyCallbacks(
  onData: PtyDataCallback,
  onExit: PtyExitCallback
): void {
  _onData = onData;
  _onExit = onExit;
}

// Map of live PTY instances
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ptys = new Map<string, any>();

/**
 * Spawn a new PTY for the given pane ID.
 * Injects TARGET and TARGET_IP from the provided env record.
 */
export function spawnPty(
  id: string,
  cols: number,
  rows: number,
  extraEnv: Record<string, string>,
  shellPath = '/bin/zsh'
): void {
  if (ptys.has(id)) {
    // Kill the old one first (e.g. restart scenario)
    try { ptys.get(id).kill(); } catch { /* ignore */ }
    ptys.delete(id);
  }

  const shell    = sanitizeShellPath(shellPath) ?? '/bin/zsh';
  const fallback = '/bin/bash';

  // Merge then sanitize: this also strips any DYLD_* the renderer tried to
  // pass through alongside the legitimate TARGET / TARGET_IP scratch vars.
  const mergedEnv = sanitizeEnv({
    ...process.env,
    ...extraEnv,
    TERM: 'xterm-256color',
  });

  let proc: unknown;
  try {
    proc = nodePty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: os.homedir(),
      env: mergedEnv,
    });
  } catch {
    // Fallback to bash if zsh is unavailable
    proc = nodePty.spawn(fallback, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: os.homedir(),
      env: mergedEnv,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = proc as any;

  p.onData((data: string) => _onData?.(id, data));
  p.onExit(({ exitCode }: { exitCode: number }) => {
    ptys.delete(id);
    _onExit?.(id, exitCode);
  });

  ptys.set(id, p);
}

/** Write data (keystroke) to a PTY's stdin. */
export function writePty(id: string, data: string): void {
  ptys.get(id)?.write(data);
}

/** Resize a PTY. */
export function resizePty(id: string, cols: number, rows: number): void {
  try {
    ptys.get(id)?.resize(cols, rows);
  } catch { /* ignore if not yet ready */ }
}

/** Kill a PTY and remove it from the map. */
export function killPty(id: string): boolean {
  const p = ptys.get(id);
  if (!p) return false;
  try { p.kill(); } catch { /* ignore */ }
  ptys.delete(id);
  return true;
}

/** Kill all live PTYs. Call on app quit. */
export function killAllPtys(): void {
  for (const [id] of ptys) {
    killPty(id);
  }
}

/** Returns true if a PTY with the given ID is alive. */
export function hasPty(id: string): boolean {
  return ptys.has(id);
}

export { __dirname };
