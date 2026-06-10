import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type {
  StrategyManifest,
  GateEntry,
  KillSwitchStatus,
  ModeFlags,
  AuditEvent,
  JbeckerRow
} from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Error handlers ──────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('[APEX Bento] unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[APEX Bento] uncaught exception:', err);
});

// ─── APEX state fixtures (READ-ONLY — no writes to APEX paths) ──────────────

const MANIFESTS: StrategyManifest[] = [
  {
    strategy_id: 'slow_mechanical',
    status: 'active',
    gate: null,
    venue: 'betfair_au',
    evidence_doc: 'build/prototype/src/apex/research/gwu_replicator.py',
    gate_14_unlock_required: true,
    description: 'GWU-paper market-making: price-band ≥50¢ post-commission. Betfair AU sole venue.'
  },
  {
    strategy_id: 'quick_buck',
    status: 'stub',
    gate: 'H2-DEFERRED',
    venue: 'sim',
    evidence_doc: null,
    gate_14_unlock_required: true,
    description: 'Strategy B — deferred until Strategy A reaches LIVE_MODE + revenue (H2 Option 2, 2026-06-10).'
  }
];

const GATES: GateEntry[] = [
  {
    id: 'GATE-12',
    label: 'Kalshi OOS revalidation',
    state: 'PENDING',
    detail: 'Full-dataset chronological OOS run with cost + slippage models. Dataset (36 GiB) not yet downloaded. Operator must move APEX repo to other laptop and run gate_12_runner.py.'
  },
  {
    id: 'GATE-12-B',
    label: 'Betfair AU edge-transfer',
    state: 'PENDING',
    detail: 'Research roadmap complete (build/gate-12-b-betfair-research.md). Awaiting operator data acquisition from Betfair AU historical feed.'
  },
  {
    id: 'GATE-14-UNLOCK',
    label: 'Autonomy unlock',
    state: 'PENDING',
    detail: 'NOT YET — no operator marker in runbook. Requires LIVE_MODE + 100-300 per-trade approvals + GATE-12 PASS + GATE-12-B PASS first.'
  },
  {
    id: 'GATE-H1',
    label: 'Frontend-design plugin',
    state: 'PENDING',
    detail: 'CyberOS frontend-design plugin gate. APEX Bento dashboard (this app) is the deliverable.'
  },
  {
    id: 'GATE-H2',
    label: 'Strategy split decision',
    state: 'RESOLVED',
    detail: 'RESOLVED 2026-06-10: Option 2 selected — sequential. Strategy A first; Strategy B deferred until A reaches LIVE_MODE + revenue.',
    resolved_at: '2026-06-10T00:00:00Z'
  }
];

const KILL_SWITCH: KillSwitchStatus = {
  state: 'running',
  since: new Date('2026-06-10T00:00:00Z').toISOString()
};

const MODE_FLAGS: ModeFlags = {
  sim_mode: true,
  demo_mode: false,
  live_mode: false,
  automated_live: false
};

const APEX_FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '..', '..', '..',
  'APEX', 'build', 'prototype', 'tests', 'fixtures', 'jbecker_sample.json'
);

// ─── IPC handlers (read-only, no writes) ────────────────────────────────────

function setupIPC(): void {
  ipcMain.handle('apex:get-manifests', (): StrategyManifest[] => MANIFESTS);

  ipcMain.handle('apex:get-gates', (): GateEntry[] => GATES);

  ipcMain.handle('apex:get-kill-switch', (): KillSwitchStatus => KILL_SWITCH);

  ipcMain.handle('apex:get-mode-flags', (): ModeFlags => MODE_FLAGS);

  ipcMain.handle('apex:get-audit-events', (): AuditEvent[] => []);

  ipcMain.handle('apex:get-jbecker-fixture', (): JbeckerRow[] => {
    try {
      if (!fs.existsSync(APEX_FIXTURE_PATH)) return [];
      const raw = fs.readFileSync(APEX_FIXTURE_PATH, 'utf-8');
      return JSON.parse(raw) as JbeckerRow[];
    } catch {
      return [];
    }
  });
}

// ─── Window state persistence ───────────────────────────────────────────────
//
// Save BrowserWindow.getNormalBounds() + isMaximized() to a JSON file under
// app.getPath('userData') on close, and restore on next launch so the operator
// doesn't have to re-position the dashboard every day.
//
// Refs:
//   https://www.electronjs.org/docs/latest/api/browser-window  (getNormalBounds, isMaximized, setBounds)
//   https://www.electronjs.org/docs/latest/api/app             (getPath('userData'))
//   https://www.electronjs.org/docs/latest/api/screen          (getDisplayMatching — guard against off-screen restore)
//
// Save is debounced via the 'close' event so resize/move don't trash the disk.

interface PersistedWindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_WINDOW_STATE: PersistedWindowState = {
  width: 1280,
  height: 820,
  isMaximized: false
};

const WINDOW_STATE_VERSION = 1;

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): PersistedWindowState {
  try {
    const p = getWindowStatePath();
    if (!fs.existsSync(p)) return DEFAULT_WINDOW_STATE;
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as { version?: number; state?: PersistedWindowState };
    if (parsed.version !== WINDOW_STATE_VERSION || !parsed.state) {
      return DEFAULT_WINDOW_STATE;
    }
    const s = parsed.state;
    // Shape validation — sizes are numbers, isMaximized is boolean.
    if (typeof s.width !== 'number' || typeof s.height !== 'number') return DEFAULT_WINDOW_STATE;
    if (typeof s.isMaximized !== 'boolean') return DEFAULT_WINDOW_STATE;
    // Floor at min window size so a corrupt file can't shrink below the configured minimum.
    return {
      x: typeof s.x === 'number' ? s.x : undefined,
      y: typeof s.y === 'number' ? s.y : undefined,
      width: Math.max(s.width, 900),
      height: Math.max(s.height, 600),
      isMaximized: s.isMaximized
    };
  } catch (err) {
    console.error('[APEX Bento] window-state load failed:', err);
    return DEFAULT_WINDOW_STATE;
  }
}

function saveWindowState(state: PersistedWindowState): void {
  try {
    const p = getWindowStatePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ version: WINDOW_STATE_VERSION, state }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[APEX Bento] window-state save failed:', err);
  }
}

// Guard against restoring to a disconnected display (e.g. external monitor
// unplugged between sessions). Returns null if bounds fall outside any active
// display, signalling that BrowserWindow should center on the primary display.
function boundsOnConnectedDisplay(state: PersistedWindowState): boolean {
  if (typeof state.x !== 'number' || typeof state.y !== 'number') return false;
  const rect = { x: state.x, y: state.y, width: state.width, height: state.height };
  const display = screen.getDisplayMatching(rect);
  // getDisplayMatching always returns a Display, but if the intersection area
  // is zero the saved position is effectively off-screen — verify overlap.
  const work = display.workArea;
  const overlapX = Math.max(rect.x, work.x) < Math.min(rect.x + rect.width, work.x + work.width);
  const overlapY = Math.max(rect.y, work.y) < Math.min(rect.y + rect.height, work.y + work.height);
  return overlapX && overlapY;
}

// ─── Window ──────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const saved = loadWindowState();
  const useSavedPosition = boundsOnConnectedDisplay(saved);

  mainWindow = new BrowserWindow({
    x: useSavedPosition ? saved.x : undefined,
    y: useSavedPosition ? saved.y : undefined,
    width: saved.width,
    height: saved.height,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#07080f',
    title: 'APEX Bento',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: process.env.NODE_ENV === 'development'
    }
  });

  if (saved.isMaximized) {
    mainWindow.maximize();
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Persist on close — use getNormalBounds() so a maximized window still saves
  // the underlying restore-size. Per Electron docs: getNormalBounds() returns
  // dimensions in normal state regardless of current maximized/minimized status.
  mainWindow.on('close', () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getNormalBounds();
    saveWindowState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized()
    });
  });

  mainWindow.webContents.on('will-navigate', e => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
