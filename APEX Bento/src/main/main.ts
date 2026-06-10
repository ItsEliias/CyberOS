import { app, BrowserWindow, ipcMain, session } from 'electron';
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

// ─── Permission handlers ─────────────────────────────────────────────────────
//
// APEX Bento is a read-only observability dashboard for local APEX fixtures.
// The renderer has no legitimate need for camera, microphone, geolocation,
// notifications, MIDI, HID, serial, USB, or filesystem permissions. Per
// Electron's security checklist (item "Handle session permission requests"),
// we explicitly deny every permission request rather than relying on the
// default auto-approve behaviour.
//
// One narrow allowlist: `clipboard-sanitized-write` is permitted for our own
// origin only. The operator-facing UI uses navigator.clipboard.writeText to
// copy gate runbook paths (see iter 3 / PR #105 — feature already present in
// product roadmap). Sanitized writes are plain-text only and pose no
// credential-exfiltration surface.
//
// Sources:
//   https://www.electronjs.org/docs/latest/tutorial/security
//   https://www.electronjs.org/docs/latest/api/session

const ALLOWED_PERMISSIONS = new Set<string>(['clipboard-sanitized-write']);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  // Production: file:// (loadFile in main.ts)
  if (origin === 'file://') return true;
  // Development: vite dev server only (loadURL in main.ts)
  if (process.env.NODE_ENV === 'development' && origin === 'http://localhost:5173') return true;
  return false;
}

function setupPermissions(): void {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const requestingUrl = (() => {
      try { return webContents.getURL(); } catch { return ''; }
    })();
    let origin = '';
    try { origin = new URL(requestingUrl).origin; } catch {
      // file:// URLs in Electron resolve to origin 'file://'
      if (requestingUrl.startsWith('file://')) origin = 'file://';
    }

    const allowed = ALLOWED_PERMISSIONS.has(permission) && isAllowedOrigin(origin);
    if (!allowed) {
      console.warn(
        `[APEX Bento] denied permission request: permission=${permission} origin=${origin || '(unknown)'}`
      );
    }
    callback(allowed);
  });

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return ALLOWED_PERMISSIONS.has(permission) && isAllowedOrigin(requestingOrigin);
  });
}

// ─── Window ──────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('will-navigate', e => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupPermissions();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
