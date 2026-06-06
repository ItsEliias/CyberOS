/**
 * ipc/terminallink.ts — TerminalLink
 * All IPC handlers for PTY management, session context, command history,
 * config read/write, and export dialogs.
 *
 * node-pty MUST stay in the main process (native module — no renderer support).
 * All PTY operations delegate to ptyManager.ts.
 */
import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  spawnPty,
  writePty,
  resizePty,
  killPty,
  setPtyCallbacks,
} from '../ptyManager';
import {
  installHookForShell,
  uninstallHookForShell,
  startTailing,
  stopTailing,
  setExternalLineCallback,
  getHookStatus,
  SUPPORTED_SHELLS,
} from '../externalShellHook';
import type { ExternalShellId } from '../../shared/types.js';

// ─── Paths ─────────────────────────────────────────────────────────────────────
const CONFIG_PATH   = path.join(os.homedir(), 'cybertools-config.json');
const SESSIONS_DIR  = path.join(os.homedir(), 'Library', 'Application Support', 'TerminalLink', 'sessions');
const HISTORY_FILE  = path.join(SESSIONS_DIR, 'command-history.json');
const EVENTS_PATH   = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools', 'ecosystem-events.json');

// ─── Atomic file write ─────────────────────────────────────────────────────────
// Every persistent state file in this module is read by some external party
// (sibling CyberOS apps, the renderer on next mount, this process's own
// poller). A torn write would surface as JSON.parse failing back to {} or [],
// which silently wipes user state. Route all writers through this helper.
function writeFileAtomic(target: string, content: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-termlink-${process.pid}-${Date.now()}`;
  const fd  = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, content, 0, 'utf8');
    try { fs.fsyncSync(fd); } catch { /* fsync best-effort */ }
  } finally {
    try { fs.closeSync(fd); } catch { /* already closed */ }
  }
  try {
    fs.renameSync(tmp, target);
  } catch {
    // Cross-device fallback — same data, just non-atomic.
    fs.writeFileSync(target, content, { encoding: 'utf8' });
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// ─── Config helpers ─────────────────────────────────────────────────────────────
function readConfig(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(patch: Record<string, unknown>): void {
  try {
    const current = readConfig();
    writeFileAtomic(CONFIG_PATH, JSON.stringify({ ...current, ...patch }, null, 2));
  } catch (e) {
    console.error('[ipc/terminallink] writeConfig error:', (e as Error).message);
  }
}

function emitEcosystemEvent(event: string, data: Record<string, unknown>): void {
  try {
    let events: unknown[] = [];
    try { events = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8')); } catch { /* empty */ }
    events.push({
      app: 'TerminalLink',
      event,
      data,
      timestamp: new Date().toISOString(),
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
    if (events.length > 200) events = events.slice(-200);
    writeFileAtomic(EVENTS_PATH, JSON.stringify(events, null, 2));
  } catch (e) {
    console.error('[ipc/terminallink] emitEcosystemEvent error:', (e as Error).message);
  }
}

// ─── Register all IPC handlers ─────────────────────────────────────────────────
export function registerTerminalLinkIPC(win: BrowserWindow): void {

  // Install PTY callbacks so output is forwarded to the renderer
  setPtyCallbacks(
    (id, data) => win.webContents.send('pty-data', { id, data }),
    (id, code) => win.webContents.send('pty-exit', { id, code }),
  );

  // Forward external-shell-hook command lines into the renderer. The renderer
  // funnels these through addCommand so they merge with the in-app log.
  setExternalLineCallback(entry => {
    try {
      win.webContents.send('externalshell:command', entry);
    } catch { /* renderer may be torn down */ }
  });

  // ── PTY: create ─────────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:pty:create', (_evt, id: string, env: Record<string, string> = {}) => {
    try {
      const cfg         = readConfig();
      const sharedCtx   = (cfg.shared_context || cfg.recondesk_status || {}) as Record<string, unknown>;
      const activeTarget = (sharedCtx.activeTarget || sharedCtx.active_target || '') as string;
      const activeIP     = (sharedCtx.activeIP     || sharedCtx.active_ip     || sharedCtx.targetIP || '') as string;

      const shellPath = ((cfg.terminallink_settings as Record<string, unknown>)?.shellPath as string) || '/bin/zsh';

      spawnPty(id, env.cols ? Number(env.cols) : 80, env.rows ? Number(env.rows) : 24, {
        ...env,
        TARGET:    activeTarget,
        TARGET_IP: activeIP,
      }, shellPath);

      return { success: true };
    } catch (e) {
      console.error('[ipc/terminallink] pty:create error:', (e as Error).message);
      return { error: (e as Error).message };
    }
  });

  // ── PTY: write ──────────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:pty:write', (_evt, id: string, data: string) => {
    writePty(id, data);
    return true;
  });

  // ── PTY: resize ─────────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:pty:resize', (_evt, id: string, cols: number, rows: number) => {
    resizePty(id, cols, rows);
    return true;
  });

  // ── PTY: kill ───────────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:pty:kill', (_evt, id: string) => {
    return killPty(id);
  });

  // ── Sessions: read ──────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:sessions:read', () => {
    try {
      const file = path.join(SESSIONS_DIR, 'sessions.json');
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      if (!fs.existsSync(file)) return [];
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return [];
    }
  });

  // ── Sessions: write ─────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:sessions:write', (_evt, sessions: unknown) => {
    try {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      writeFileAtomic(path.join(SESSIONS_DIR, 'sessions.json'), JSON.stringify(sessions, null, 2));
      return { success: true };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });

  // ── History: read ───────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:history:read', () => {
    try {
      if (!fs.existsSync(HISTORY_FILE)) return [];
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch {
      return [];
    }
  });

  // ── History: write ──────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:history:write', (_evt, history: unknown) => {
    try {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      writeFileAtomic(HISTORY_FILE, JSON.stringify(history, null, 2));

      const cfg        = readConfig();
      const prevStatus = (cfg.terminallink_status || {}) as Record<string, unknown>;
      writeConfig({
        terminallink_status: {
          ...prevStatus,
          active:      true,
          lastActive:  new Date().toISOString(),
          commandCount: Array.isArray(history) ? history.length : 0,
        },
      });

      return { success: true };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });

  // ── Config: read (shared_context) ───────────────────────────────────────────
  ipcMain.handle('terminallink:config:read', () => {
    try {
      const cfg         = readConfig();
      const sharedCtx   = (cfg.shared_context      || {}) as Record<string, unknown>;
      const recondesk   = (cfg.recondesk_status     || {}) as Record<string, unknown>;
      const cyberlab    = (cfg.cyberlab_status       || {}) as Record<string, unknown>;

      return {
        activeLab:    (sharedCtx.activeLab    || cyberlab.activeLab    || '') as string,
        activeTarget: (sharedCtx.activeTarget || recondesk.activeTarget || '') as string,
        activeIP:     (sharedCtx.activeIP     || recondesk.activeIP    || recondesk.targetIP || '') as string,
        sessions:     Array.isArray(cyberlab.sessions) ? cyberlab.sessions as string[] : [],
      };
    } catch {
      return {};
    }
  });

  // ── Config: write (terminallink_status patch) ───────────────────────────────
  // Only allow a tiny whitelist of status keys through. The shared cybertools
  // config is read by every sibling app — letting the renderer write arbitrary
  // shapes (or prototype-pollution keys) would let it influence what those
  // other apps see for "TerminalLink status".
  const STATUS_ALLOWED = new Set([
    'active',
    'lastActive',
    'commandCount',
    'activeSessionId',
    'paneCount',
  ]);
  ipcMain.handle('terminallink:config:write', (_evt, patch: Record<string, unknown>) => {
    try {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return { error: 'invalid patch' };
      }
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        // Block prototype-pollution sentinels regardless of the allow-list.
        if (k === '__proto__' || k === 'prototype' || k === 'constructor') continue;
        if (!STATUS_ALLOWED.has(k)) continue;
        safe[k] = v;
      }
      writeConfig({ terminallink_status: safe });
      return { success: true };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });

  // ── Export: save dialog ─────────────────────────────────────────────────────
  ipcMain.handle('terminallink:export:dialog', async (_evt, content: string) => {
    try {
      const result = await dialog.showSaveDialog(win, {
        title: 'Export Command History',
        defaultPath: path.join(os.homedir(), `terminallink-history-${Date.now()}.txt`),
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });
      if (result.canceled || !result.filePath) return { success: false, reason: 'cancelled' };
      fs.writeFileSync(result.filePath, content, 'utf8');
      emitEcosystemEvent('history:exported', { path: result.filePath });
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, reason: (e as Error).message };
    }
  });

  // ── Event: emit ─────────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:event:emit', (_evt, event: string, data: Record<string, unknown> = {}) => {
    emitEcosystemEvent(event, data);
    return true;
  });

  // ── GhostVault: save text ────────────────────────────────────────────────
  ipcMain.handle('terminallink:ghostvault:save', async (_evt, {
    title, content, folder,
  }: { title: string; content: string; folder?: string }) => {
    try {
      const cfg = readConfig();
      const activeLab = ((cfg.shared_context as Record<string,unknown>)?.activeLab as string) ?? 'Unknown';
      const base = path.join(
        os.homedir(), 'Documents', 'CyberOS-Vault', 'TerminalLink',
        folder ?? activeLab
      );
      fs.mkdirSync(base, { recursive: true });
      const safe = title.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'capture';
      const filePath = path.join(base, `${safe}-${Date.now()}.txt`);
      fs.writeFileSync(filePath, content, 'utf8');
      emitEcosystemEvent('terminallink:output:saved', { path: filePath, title });
      return { ok: true, path: filePath };
    } catch (e) {
      return { ok: false, path: '', error: (e as Error).message };
    }
  });

  // ── Session export dialog ────────────────────────────────────────────────
  ipcMain.handle('terminallink:session:export', async (_evt, {
    content, ext,
  }: { content: string; ext: 'cast' | 'txt' }) => {
    try {
      const result = await dialog.showSaveDialog(win, {
        title: `Export Session as .${ext}`,
        defaultPath: path.join(os.homedir(), `session-${Date.now()}.${ext}`),
        filters: ext === 'cast'
          ? [{ name: 'Asciinema Cast', extensions: ['cast'] }]
          : [{ name: 'Text', extensions: ['txt'] }],
      });
      if (result.canceled || !result.filePath) return { success: false };
      fs.writeFileSync(result.filePath, content, 'utf8');
      emitEcosystemEvent('terminallink:session:exported', { path: result.filePath });
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  // ── Binary check ─────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:binary:check', async (_evt, bin: string) => {
    const { execSync } = await import('child_process');
    try {
      execSync(`which ${bin}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });

  // ── Vault: save text note ─────────────────────────────────────────────────
  ipcMain.handle('terminallink:vault:save-text', async (_evt, {
    title, content, folder,
  }: { title: string; content: string; folder?: string }) => {
    try {
      const cfg = readConfig();
      const activeLab = ((cfg.shared_context as Record<string, unknown>)?.activeLab as string) ?? 'Captures';
      const base = path.join(
        os.homedir(), 'Documents', 'CyberOS-Vault', 'TerminalLink',
        folder || activeLab
      );
      fs.mkdirSync(base, { recursive: true });
      const safe = (title || 'note').replace(/[^a-zA-Z0-9_\- ]/g, '_').trim();
      const filePath = path.join(base, `${safe}-${Date.now()}.txt`);
      fs.writeFileSync(filePath, content, 'utf8');
      emitEcosystemEvent('terminallink:vault:saved', { path: filePath, title });
      return { success: true, path: filePath };
    } catch (e) {
      return { success: false, path: '' };
    }
  });

  // ── Recording: save ───────────────────────────────────────────────────────
  ipcMain.handle('terminallink:recording:save', async (_evt, {
    sessionId, data,
  }: { sessionId: string; data: unknown }) => {
    try {
      const dir = path.join(SESSIONS_DIR, 'recordings');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${sessionId}.cast`);
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
      return { success: true, path: filePath };
    } catch (e) {
      return { success: false };
    }
  });

  // ── Recording: list ───────────────────────────────────────────────────────
  ipcMain.handle('terminallink:recording:list', () => {
    try {
      const dir = path.join(SESSIONS_DIR, 'recordings');
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.cast'))
        .map(f => {
          try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
          catch { return null; }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  });

  // ── Prefs: save ───────────────────────────────────────────────────────────
  const PREFS_PATH = path.join(SESSIONS_DIR, 'prefs.json');
  ipcMain.handle('terminallink:prefs:save', (_evt, prefs: Record<string, unknown>) => {
    try {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  // ── Prefs: load ───────────────────────────────────────────────────────────
  ipcMain.handle('terminallink:prefs:load', () => {
    try {
      if (!fs.existsSync(PREFS_PATH)) return {};
      return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'));
    } catch {
      return {};
    }
  });

  // ── External Shell Hook: install ─────────────────────────────────────────
  ipcMain.handle(
    'terminallink:externalshell:install',
    (_evt, shells: ExternalShellId[]) => {
      const targets = (shells || []).filter(s => SUPPORTED_SHELLS.includes(s));
      const results = targets.map(installHookForShell);
      const errored = results.filter(r => r.error);
      if (errored.length === 0) {
        startTailing();
      }
      return {
        success: errored.length === 0,
        results,
        status: getHookStatus(),
      };
    },
  );

  // ── External Shell Hook: uninstall ───────────────────────────────────────
  ipcMain.handle(
    'terminallink:externalshell:uninstall',
    (_evt, shells?: ExternalShellId[]) => {
      const targets = (
        shells && shells.length > 0 ? shells : (SUPPORTED_SHELLS as ExternalShellId[])
      ).filter(s => SUPPORTED_SHELLS.includes(s));
      const results = targets.map(uninstallHookForShell);
      // Stop tailing only when no shell still has the hook installed.
      const stillInstalled = SUPPORTED_SHELLS.some(s => getHookStatus().installed[s]);
      if (!stillInstalled) {
        stopTailing();
      }
      return {
        success: results.every(r => !r.error),
        results,
        status: getHookStatus(),
      };
    },
  );

  // ── External Shell Hook: status ──────────────────────────────────────────
  ipcMain.handle('terminallink:externalshell:status', () => getHookStatus());

  // ── External Shell Hook: start/stop tail independently ───────────────────
  ipcMain.handle('terminallink:externalshell:start-tail', () => {
    startTailing();
    return getHookStatus();
  });
  ipcMain.handle('terminallink:externalshell:stop-tail', () => {
    stopTailing();
    return getHookStatus();
  });
}
