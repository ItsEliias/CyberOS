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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require  = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodePty   = _require('node-pty') as any;

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

  const shell = shellPath || '/bin/zsh';
  const fallback = '/bin/bash';

  let proc: unknown;
  try {
    proc = nodePty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME ?? '/tmp',
      env: {
        ...process.env,
        ...extraEnv,
        TERM: 'xterm-256color',
      },
    });
  } catch {
    // Fallback to bash if zsh is unavailable
    proc = nodePty.spawn(fallback, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME ?? '/tmp',
      env: {
        ...process.env,
        ...extraEnv,
        TERM: 'xterm-256color',
      },
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
