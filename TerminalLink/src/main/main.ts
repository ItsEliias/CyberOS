import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import type { CommandEntry } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require   = createRequire(import.meta.url);
const pty        = _require('node-pty');

// ─── Globals ──────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
const ptys = new Map<string, ReturnType<typeof pty.spawn>>();

const CONFIG_PATH     = path.join(process.env.HOME!, 'cybertools-config.json');
const EVENTS_PATH     = path.join(process.env.HOME!, 'Library', 'Application Support', 'CyberTools', 'ecosystem-events.json');
const SESSIONS_DIR    = path.join(process.env.HOME!, 'Library', 'Application Support', 'TerminalLink', 'sessions');

const preloadFile = fs.existsSync(path.join(__dirname, '..', 'preload', 'preload.mjs'))
  ? 'preload.mjs' : 'preload.js';
const preloadPath = path.join(__dirname, '..', 'preload', preloadFile);

// ─── Config helpers ───────────────────────────────────────────────────────────
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
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...patch }, null, 2));
  } catch (e) {
    console.error('[terminallink] writeConfig error:', (e as Error).message);
  }
}

function emitEcosystemEvent(event: string, data: Record<string, unknown>): void {
  try {
    fs.mkdirSync(path.dirname(EVENTS_PATH), { recursive: true });
    let events: unknown[] = [];
    try { events = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8')); } catch { /* empty */ }
    events.push({
      app: 'TerminalLink',
      event,
      data,
      timestamp: new Date().toISOString(),
      id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    });
    // Keep last 200 events
    if (events.length > 200) events = events.slice(-200);
    fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2));
  } catch (e) {
    console.error('[terminallink] emitEcosystemEvent error:', (e as Error).message);
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000, height: 700,
    minWidth: 800, minHeight: 500,
    title: 'TerminalLink',
    backgroundColor: '#0a0e14',
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => { mainWindow!.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });

  app.whenReady().then(() => {
    createWindow();
    writeConfig({ terminallink_status: { active: true, lastActive: new Date().toISOString(), commandCount: 0 } });
    emitEcosystemEvent('session:started', { timestamp: new Date().toISOString() });

    app.on('activate', () => {
      if (!mainWindow) createWindow();
      else { mainWindow.show(); mainWindow.focus(); }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    for (const [, proc] of ptys) {
      try { proc.kill(); } catch { /* ignore */ }
    }
    ptys.clear();
  });
}

// ─── IPC: PTY ─────────────────────────────────────────────────────────────────
ipcMain.handle('pty-create', (_evt, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
  try {
    const cfg = readConfig();
    const sharedCtx = (cfg.shared_context || cfg.recondesk_status || {}) as Record<string, unknown>;
    const activeTarget = (sharedCtx.activeTarget || sharedCtx.active_target || '') as string;
    const activeIP     = (sharedCtx.activeIP     || sharedCtx.active_ip     || sharedCtx.targetIP || '') as string;

    const proc = pty.spawn('/bin/zsh', [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME,
      env: {
        ...process.env,
        TARGET:    activeTarget,
        TARGET_IP: activeIP,
        TERM:      'xterm-256color'
      }
    });

    proc.onData((data: string) => {
      mainWindow?.webContents.send('pty-data', { id, data });
    });

    proc.onExit(({ exitCode }: { exitCode: number }) => {
      mainWindow?.webContents.send('pty-exit', { id, code: exitCode });
      ptys.delete(id);
    });

    ptys.set(id, proc);
    return { success: true };
  } catch (e) {
    console.error('[terminallink] pty-create error:', (e as Error).message);
    return { error: (e as Error).message };
  }
});

ipcMain.on('pty-write', (_evt, { id, data }: { id: string; data: string }) => {
  ptys.get(id)?.write(data);
});

ipcMain.on('pty-resize', (_evt, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
  ptys.get(id)?.resize(cols, rows);
});

ipcMain.handle('pty-kill', (_evt, { id }: { id: string }) => {
  try {
    ptys.get(id)?.kill();
    ptys.delete(id);
    return true;
  } catch {
    return false;
  }
});

// ─── IPC: Session context ─────────────────────────────────────────────────────
ipcMain.handle('get-session-context', () => {
  try {
    const cfg = readConfig();
    const sharedCtx      = (cfg.shared_context      || {}) as Record<string, unknown>;
    const recondeskStatus = (cfg.recondesk_status   || {}) as Record<string, unknown>;
    const cyberlabStatus  = (cfg.cyberlab_status    || {}) as Record<string, unknown>;

    const activeLab    = (sharedCtx.activeLab    || cyberlabStatus.activeLab    || '') as string;
    const activeTarget = (sharedCtx.activeTarget || recondeskStatus.activeTarget || '') as string;
    const activeIP     = (sharedCtx.activeIP     || recondeskStatus.activeIP     || recondeskStatus.targetIP || '') as string;

    let sessions: string[] = [];
    if (Array.isArray(cyberlabStatus.sessions)) sessions = cyberlabStatus.sessions as string[];

    return { activeLab, activeTarget, activeIP, sessions };
  } catch {
    return {};
  }
});

// ─── IPC: Log commands ────────────────────────────────────────────────────────
ipcMain.handle('log-commands', (_evt, { commands }: { commands: CommandEntry[] }) => {
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const sessionFile = path.join(SESSIONS_DIR, 'current.json');
    let existing: CommandEntry[] = [];
    try { existing = JSON.parse(fs.readFileSync(sessionFile, 'utf8')); } catch { /* empty */ }

    const merged = [...existing, ...commands];
    fs.writeFileSync(sessionFile, JSON.stringify(merged, null, 2));

    const cfg = readConfig();
    const prevStatus = (cfg.terminallink_status || {}) as Record<string, unknown>;
    const linked = prevStatus.linkedSession as string | undefined;
    writeConfig({
      terminallink_status: {
        active: true,
        lastActive: new Date().toISOString(),
        commandCount: merged.length,
        linkedSession: linked
      }
    });

    if (commands.length > 0) {
      emitEcosystemEvent('command:executed', {
        commandCount: commands.length,
        lastCommand: commands[commands.length - 1].command
      });
    }

    return { success: true };
  } catch (e) {
    console.error('[terminallink] log-commands error:', (e as Error).message);
    return { error: (e as Error).message };
  }
});

// ─── IPC: Version ─────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion());
