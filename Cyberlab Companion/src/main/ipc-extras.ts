/**
 * Extra IPC handlers: Ollama, Screenshots, ReconDesk, OperatorProfile, Lab orchestration
 * Registered from main.ts via registerExtrasIPC()
 */
import { ipcMain, desktopCapturer, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import https from 'https';
import { emitEvent } from './ecosystem-bus.js';
import { URL } from 'url';

const CONFIG_PATH = sharedConfigPath();

// ── Operator Profile ──────────────────────────────────────────────────────────

function updateOperatorProfile(updates: Record<string, unknown>): void {
  try {
    let shared: Record<string, unknown> = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { shared = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
    }
    const existing = (shared.operator_profile as Record<string, unknown>) || {};
    shared.operator_profile = { ...existing, ...updates };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(shared, null, 2), 'utf8');
  } catch {}
}

function computeStreak(lastActiveDate: string): { streak: number; changed: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  if (!lastActiveDate) return { streak: 1, changed: true };
  const last = lastActiveDate.slice(0, 10);
  if (last === today) return { streak: 0, changed: false }; // already counted today
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return last === yesterday ? { streak: 1, changed: true } : { streak: -1, changed: true };
  // streak: 1 = add 1, streak: -1 = reset to 1
}

function getSkillDeltas(platform: string, labType: string): Record<string, number> {
  const p = platform.toUpperCase();
  const t = (labType || '').toLowerCase();

  if (p === 'CTF') return { crypto: 1, web: 1 };

  // HTB / THM
  if (t.includes('web') || t.includes('web app')) return { web: 3 };
  if (t.includes('windows') && (t.includes('active directory') || t.includes('ad'))) return { activeDirectory: 2, windows: 2 };
  if (t.includes('windows')) return { activeDirectory: 2, windows: 2 };
  if (t.includes('linux')) return { linux: 2, network: 1 };
  if (t.includes('htb/thm linux') || t.includes('cisco') || t.includes('networking')) return { linux: 2, network: 1 };
  if (t.includes('htb/thm windows')) return { activeDirectory: 2, windows: 2 };

  // fallback
  return { linux: 2, network: 1 };
}

function fetchJSON(url: string, opts: { method?: string; headers?: Record<string,string>; body?: string } = {}): Promise<{ status: number; data: unknown; raw?: boolean }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, data, raw: true }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

export function registerExtrasIPC() {
  // ── Operator profile IPC ────────────────────────────────────────────────────

  ipcMain.handle('update-operator-profile', (_, updates: Record<string, unknown>) => {
    try { updateOperatorProfile(updates); } catch {}
  });

  ipcMain.handle('increment-flags', (_, count: number = 1) => {
    try {
      let shared: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try { shared = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
      }
      const profile = (shared.operator_profile as Record<string, unknown>) || {};
      const current = typeof profile.totalFlags === 'number' ? profile.totalFlags : 0;
      updateOperatorProfile({ totalFlags: current + (count || 1) });
    } catch {}
  });

  ipcMain.handle('complete-lab', (_, { platform, labType }: { platform: string; labType: string }) => {
    try {
      let shared: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try { shared = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
      }
      const profile = (shared.operator_profile as Record<string, unknown>) || {};

      const currentLabs = typeof profile.totalLabsCompleted === 'number' ? profile.totalLabsCompleted : 0;
      const lastActive = typeof profile.lastActiveDate === 'string' ? profile.lastActiveDate : '';
      const currentStreak = typeof profile.currentStreak === 'number' ? profile.currentStreak : 0;
      const skillProgress = (profile.skillProgress as Record<string, number>) || {
        web: 0, network: 0, activeDirectory: 0, linux: 0, windows: 0, crypto: 0, forensics: 0
      };

      const today = new Date().toISOString().slice(0, 10);
      const { streak, changed } = computeStreak(lastActive);
      let newStreak = currentStreak;
      if (changed) {
        newStreak = streak === -1 ? 1 : currentStreak + 1;
      }

      const deltas = getSkillDeltas(platform, labType);
      const newSkills = { ...skillProgress };
      for (const [k, v] of Object.entries(deltas)) {
        newSkills[k] = (typeof newSkills[k] === 'number' ? newSkills[k] : 0) + v;
      }

      updateOperatorProfile({
        totalLabsCompleted: currentLabs + 1,
        lastActiveDate: today,
        currentStreak: newStreak,
        skillProgress: newSkills,
      });
    } catch {}
  });

  // Ollama chat
  ipcMain.handle('ollama-chat', async (_, payload: { model: string; messages: Array<{role: string; content: string}>; endpoint?: string }) => {
    const endpoint = payload.endpoint || 'http://localhost:11434';
    try {
      const body = JSON.stringify({ model: payload.model, messages: payload.messages, stream: false });
      const result = await fetchJSON(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)) },
        body,
      });
      if (result.status !== 200) return { success: false, error: `Ollama returned ${result.status}` };
      const msg = (result.data as Record<string, unknown>)?.message as Record<string, unknown>;
      return { success: true, content: (msg?.content as string) || '' };
    } catch (e: unknown) {
      const m = (e as Error).message || '';
      if (m.includes('ECONNREFUSED') || m.includes('connect')) {
        return { success: false, error: 'Ollama not running. Start it with: ollama serve' };
      }
      return { success: false, error: m };
    }
  });

  // Ollama list models
  ipcMain.handle('ollama-list-models', async (_, endpoint?: string) => {
    const base = endpoint || 'http://localhost:11434';
    try {
      const result = await fetchJSON(`${base}/api/tags`);
      if (result.status !== 200) return { success: false, models: [], error: `Ollama returned ${result.status}` };
      const models = ((result.data as Record<string, unknown>)?.models as Array<Record<string, unknown>>) || [];
      return { success: true, models: models.map(m => m.name as string) };
    } catch {
      return { success: false, models: [], error: 'Ollama not running. Start it with: ollama serve' };
    }
  });

  // Screenshot capture
  ipcMain.handle('take-screenshot', async () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: primaryDisplay.size.width, height: primaryDisplay.size.height },
      });
      if (!sources.length) return { success: false, error: 'No screen sources found' };
      const primary = sources.find(s => s.name === 'Entire Screen' || s.name === 'Screen 1') || sources[0];
      return { success: true, data: primary.thumbnail.toPNG().toString('base64') };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  // Save screenshot to vault
  ipcMain.handle('save-screenshot', (_, { base64, labName, vaultPath }: { base64: string; sessionName: string; labName: string; vaultPath: string }) => {
    try {
      if (!vaultPath) throw new Error('No vault path configured');
      const dir = path.join(vaultPath, 'CyberLab', labName.replace(/[^a-zA-Z0-9 -]/g, '').trim(), 'screenshots');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fp = path.join(dir, `${ts}.png`);
      fs.writeFileSync(fp, Buffer.from(base64, 'base64'));
      return { success: true, path: fp };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  // Save annotated screenshot to userData
  ipcMain.handle('save-annotated-screenshot', (_, { base64, sessionId, labName }: { base64: string; sessionId: string; labName: string }) => {
    try {
      const { app } = require('electron');
      const dir = path.join(app.getPath('userData'), 'screenshots', sessionId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fp = path.join(dir, `${ts}.png`);
      fs.writeFileSync(fp, Buffer.from(base64.replace(/^data:image\/png;base64,/, ''), 'base64'));
      return { success: true, path: fp, id: ts };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  // Push finding to ReconDesk config
  ipcMain.handle('push-to-recondesk', (_, { targetName, finding }: { targetName: string; finding: { type: string; data: Record<string, unknown> } }) => {
    try {
      let cfg: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
      }
      const targets: Record<string, unknown>[] = (cfg.targets as Record<string, unknown>[]) || [];
      let idx = targets.findIndex((t) => t.name === targetName);
      if (idx === -1) {
        targets.push({ name: targetName, ports: [], credentials: [], cards: [] });
        idx = targets.length - 1;
      }
      const target = targets[idx] as Record<string, unknown[]>;
      const key = finding.type === 'port' ? 'ports' : finding.type === 'credential' ? 'credentials' : 'cards';
      if (!Array.isArray(target[key])) target[key] = [];
      (target[key] as unknown[]).push({ ...finding.data, addedAt: new Date().toISOString() });
      cfg.targets = targets;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
      return { success: true };
    } catch (e: unknown) { return { success: false, error: (e as Error).message }; }
  });

  // Get ReconDesk target
  ipcMain.handle('get-recondesk-target', (_, { targetName }: { targetName: string }) => {
    try {
      if (!fs.existsSync(CONFIG_PATH)) return null;
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;
      const targets = (cfg.targets as Record<string, unknown>[]) || [];
      return targets.find((t) => t.name === targetName) || null;
    } catch { return null; }
  });

  // ── Lab orchestration ────────────────────────────────────────────────────────

  ipcMain.handle('lab:start', (_, { name, platform, targetIP, findingsCount }: { name: string; platform: string; targetIP?: string; findingsCount?: number }) => {
    try {
      const now = new Date().toISOString();
      let existing: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
      }
      const existingCtx = (existing.shared_context as Record<string, unknown>) || {};
      existing.shared_context = {
        ...existingCtx,
        activeLab: name,
        activeTarget: name,
        activeIP: targetIP || null,
        activePlaybook: null,
        lastUpdated: now,
        updatedBy: 'CyberLab',
      };
      existing.lab_session = { name, platform, startedAt: now, status: 'active' };
      existing.cyberlab_status = {
        active: true,
        currentLab: name,
        sessionActive: true,
        findingsCount: typeof findingsCount === 'number' ? findingsCount : 0,
        lastActive: now,
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf8');
      emitEvent('CyberLab', 'lab:started', { name, platform, startedAt: now });
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('lab:update-findings', (_, { findingsCount }: { findingsCount: number }) => {
    try {
      const now = new Date().toISOString();
      let existing: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
      }
      const existingStatus = (existing.cyberlab_status as Record<string, unknown>) || {};
      existing.cyberlab_status = { ...existingStatus, findingsCount, lastActive: now };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf8');
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('lab:end', () => {
    try {
      const now = new Date().toISOString();
      let existing: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_PATH)) {
        try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
      }
      const existingCtx = (existing.shared_context as Record<string, unknown>) || {};
      existing.shared_context = {
        ...existingCtx,
        activeLab: null,
        activeTarget: null,
        activeIP: null,
        lastUpdated: now,
        updatedBy: 'CyberLab',
      };
      const existingSession = (existing.lab_session as Record<string, unknown>) || {};
      existing.lab_session = { ...existingSession, status: 'completed', completedAt: now };
      existing.cyberlab_status = {
        active: false,
        currentLab: null,
        sessionActive: false,
        findingsCount: 0,
        lastActive: now,
      };
      const profile = (existing.operator_profile as Record<string, unknown>) || {};
      const totalLabs = typeof profile.totalLabsCompleted === 'number' ? profile.totalLabsCompleted : 0;
      const today = now.slice(0, 10);
      const activityDates = Array.isArray(profile.activityDates) ? [...(profile.activityDates as string[])] : [];
      if (!activityDates.includes(today)) activityDates.push(today);
      existing.operator_profile = { ...profile, totalLabsCompleted: totalLabs + 1, activityDates };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf8');
      emitEvent('CyberLab', 'lab:completed', { completedAt: now });
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  });
}
