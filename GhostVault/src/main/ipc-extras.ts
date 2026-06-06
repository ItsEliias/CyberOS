/**
 * Additional IPC handlers: global hotkey, clipboard, session context, Ollama.
 * Imported once by main.ts after app is ready.
 */
import { ipcMain, globalShortcut, clipboard } from 'electron';
import fs from 'fs';
import http from 'http';
import type { BrowserWindow } from 'electron';

export const DEFAULT_CAPTURE_HOTKEY = 'CommandOrControl+Shift+G';

interface ConfigAccessors {
  loadConfig: () => { captureHotkey?: string; captureTheme?: unknown };
  saveConfig: (c: Record<string, unknown>) => boolean;
  cybertoolsConfigPath: string;
  getCaptureWindow: () => BrowserWindow | null;
  createCaptureWindow: () => void;
  sendCaptureFolders: () => void;
}

// ── Ollama helpers ─────────────────────────────────────────────────────────────
function checkOllamaRunning(): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: 'localhost', port: 11434, path: '/api/tags', method: 'GET' },
      res => { resolve(res.statusCode === 200); }
    );
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function callOllama(model: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: model || 'mistral', prompt, stream: false });
    const req  = http.request({
      hostname: 'localhost', port: 11434, path: '/api/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', (c: string) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).response || data); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Ollama timeout')); });
    req.write(body);
    req.end();
  });
}

function fetchTags(): Promise<string[]> {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: 'localhost', port: 11434, path: '/api/tags', method: 'GET' },
      res => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => {
          try { resolve((JSON.parse(data)?.models || []).map((m: { name: string }) => m.name).sort()); }
          catch { resolve([]); }
        });
      }
    );
    req.on('error', () => resolve([]));
    req.end();
  });
}

const OLLAMA_PROMPTS: Record<string, string> = {
  work: `You are formatting a work note. PRESERVE every name, phone number, email, date, time, and amount EXACTLY as written. Add structure AROUND content. Use clean professional markdown. Extract action items as - [ ] checkboxes. NO buzzwords or AI filler. Output ONLY the formatted markdown.`,
  cyber: `You are formatting a cybersecurity note. PRESERVE all IPs, ports, hashes, CVEs, domains EXACTLY. Wrap commands in code blocks. Structure: Target Info → Ports → Findings → Commands → Next Steps. Output ONLY the formatted markdown.`,
  personal: `You are lightly organising a personal note. Keep the writer's voice. PRESERVE all specific details. Only add structure if genuinely messy. Use simple markdown. Checkboxes for tasks. Output ONLY the formatted markdown.`,
};

function buildOllamaPrompt(text: string, ctx: string): string {
  const instruction = OLLAMA_PROMPTS[ctx] || OLLAMA_PROMPTS.work;
  return `${instruction}\n\nRAW NOTE TO FORMAT:\n---\n${text}\n---`;
}

// ── Main export ────────────────────────────────────────────────────────────────
export function registerExtras(ctx: ConfigAccessors) {
  const { loadConfig, saveConfig, cybertoolsConfigPath, getCaptureWindow, createCaptureWindow, sendCaptureFolders } = ctx;

  function openCapture() {
    const win = getCaptureWindow();
    if (!win) { createCaptureWindow(); return; }
    if (win.isVisible()) { win.focus(); return; }
    sendCaptureFolders();
    win.show();
    win.setAlwaysOnTop(true, 'floating');
    win.focus();
  }

  // ── Hotkey ──────────────────────────────────────────────────────────────────
  ipcMain.handle('get-capture-hotkey', () => loadConfig().captureHotkey || DEFAULT_CAPTURE_HOTKEY);

  ipcMain.handle('set-capture-hotkey', (_, newKey: string) => {
    // Require an Electron-style accelerator with at least one modifier
    // (CommandOrControl, Cmd, Ctrl, Alt, Option, Shift, Super). Without
    // this, the renderer could register the bare 'A' key as a global
    // shortcut and swallow every 'A' the user types systemwide.
    const MOD = /\b(CommandOrControl|CmdOrCtrl|Command|Cmd|Control|Ctrl|Alt|Option|Shift|Super|Meta)\b/i;
    if (
      typeof newKey !== 'string' ||
      newKey.length === 0 ||
      newKey.length > 64 ||
      !MOD.test(newKey)
    ) {
      return { ok: false, error: 'Hotkey must include at least one modifier (Cmd/Ctrl/Alt/Shift)' };
    }
    const oldKey = loadConfig().captureHotkey || DEFAULT_CAPTURE_HOTKEY;
    try { globalShortcut.unregister(oldKey); } catch { /* ignore */ }
    const ok = globalShortcut.register(newKey, openCapture);
    if (!ok) {
      console.warn('[GhostVault] Failed to register hotkey:', newKey);
      try { globalShortcut.register(oldKey, openCapture); } catch { /* ignore */ }
      return { ok: false, error: `Hotkey "${newKey}" is already in use by another app` };
    }
    saveConfig({ captureHotkey: newKey });
    return { ok: true };
  });

  // ── Clipboard ───────────────────────────────────────────────────────────────
  ipcMain.handle('read-clipboard', () => clipboard.readText());

  // ── Session context ─────────────────────────────────────────────────────────
  ipcMain.handle('get-session-context', () => {
    try {
      if (!fs.existsSync(cybertoolsConfigPath)) return null;
      const shared = JSON.parse(fs.readFileSync(cybertoolsConfigPath, 'utf8'));
      const lab    = shared?.cyberlab_status?.currentLab    || null;
      const target = shared?.recondesk_status?.activeTarget || shared?.cyberlab_status?.activeTarget || null;
      const ip     = shared?.recondesk_status?.activeIP     || shared?.cyberlab_status?.activeIP     || null;
      if (!lab && !target) return null;
      return { currentLab: lab, activeTarget: target, activeIP: ip };
    } catch { return null; }
  });

  // ── Ollama ──────────────────────────────────────────────────────────────────
  ipcMain.handle('ollama-check', async () => {
    const running = await checkOllamaRunning();
    if (!running) return { running: false, models: [] };
    try {
      return { running: true, models: await fetchTags() };
    } catch { return { running: true, models: [] }; }
  });

  ipcMain.handle('ollama-format', async (_, { text, mode: _mode, ctx, model }: { text: string; mode: string; ctx: string; model?: string }) => {
    try {
      if (!await checkOllamaRunning()) return { error: 'ollama_not_running' };
      const result = await callOllama(model || 'mistral', buildOllamaPrompt(text, ctx));
      return { result: result.trim() };
    } catch (e) { return { error: (e as Error).message }; }
  });

  // ── Spec-canonical Ollama aliases ───────────────────────────────────────────
  ipcMain.handle('ghostvault:ollama:models', async () => {
    const running = await checkOllamaRunning();
    if (!running) return { running: false, models: [] };
    try { return { running: true, models: await fetchTags() }; }
    catch { return { running: true, models: [] }; }
  });

  ipcMain.handle('ghostvault:ollama:chat', async (_, model: string, messages: { role: string; content: string }[]) => {
    try {
      if (!await checkOllamaRunning()) return { error: 'ollama_not_running' };
      // Flatten messages into a single prompt
      const prompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const result = await callOllama(model || 'mistral', prompt);
      return { result: result.trim() };
    } catch (e) { return { error: (e as Error).message }; }
  });
}

