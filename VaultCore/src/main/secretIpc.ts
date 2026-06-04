// VaultCore — Secret Detection IPC Handlers
// Registers all secret-detection, git, backup, and credvault IPC handlers.

import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

const SECRET_PATTERNS = [
  { type: 'aws_key',     pattern: /AKIA[0-9A-Z]{16}/g },
  { type: 'private_key', pattern: /-----BEGIN[\w\s]*PRIVATE KEY-----/g },
  { type: 'jwt',         pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+/g },
];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.venv', '__pycache__', 'build']);
const SCAN_EXTS = new Set(['.env','.json','.yaml','.yml','.pem','.key','.crt','.cert','.sh','.bash','.txt','.py','.rb','.go','.ts','.js','.config','.conf','.ini','.toml','.xml','.properties']);

function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  const len = s.length;
  return -Object.values(freq).reduce((acc, n) => { const p = n / len; return acc + p * Math.log2(p); }, 0);
}

function scanFile(filePath: string, results: Array<{ filePath: string; lineNumber: number; patternType: string; rawValue: string }>, filesScanned: { n: number }) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 1024 * 1024) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const { type, pattern } of SECRET_PATTERNS) {
        const p = new RegExp(pattern.source, 'g');
        let m;
        while ((m = p.exec(line)) !== null) {
          results.push({ filePath, lineNumber: idx + 1, patternType: type, rawValue: m[0] });
        }
      }
      const tokens = line.split(/[\s"'=:,;(){}\[\]<>]+/).filter((t) => t.length >= 20);
      for (const tok of tokens) {
        const ent = shannonEntropy(tok);
        if (ent > 4.5 && /[a-zA-Z0-9]/.test(tok)) {
          const dupe = results.some((r) => r.lineNumber === idx + 1 && r.filePath === filePath && r.rawValue === tok);
          if (!dupe) results.push({ filePath, lineNumber: idx + 1, patternType: 'high_entropy', rawValue: tok });
        }
      }
    });
    filesScanned.n++;
  } catch { /* skip */ }
}

function walkDir(dir: string, depth: number, results: Array<{ filePath: string; lineNumber: number; patternType: string; rawValue: string }>, filesScanned: { n: number }) {
  if (depth > 8) return;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walkDir(path.join(dir, entry.name), depth + 1, results, filesScanned);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const base = path.basename(entry.name).toLowerCase();
        if (SCAN_EXTS.has(ext) || base.startsWith('.env')) scanFile(path.join(dir, entry.name), results, filesScanned);
      }
    }
  } catch { /* ignore */ }
}

export function registerSecretIpc(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('scan-directory', async (_, dirPath: string) => {
    if (!dirPath || !fs.existsSync(dirPath)) return { error: 'Directory not found' };
    const results: Array<{ filePath: string; lineNumber: number; patternType: string; rawValue: string }> = [];
    const filesScanned = { n: 0 };
    const startTime = Date.now();
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) walkDir(dirPath, 0, results, filesScanned);
    else scanFile(dirPath, results, filesScanned);
    return { results, filesScanned: filesScanned.n, duration: Date.now() - startTime };
  });

  ipcMain.handle('git-branches', async (_, repoPath: string) => {
    if (!repoPath) return { error: 'No repo path' };
    try {
      const { stdout } = await execAsync('git branch -a --format=%(refname:short)', { cwd: repoPath });
      return { branches: stdout.split('\n').map((b) => b.trim()).filter(Boolean) };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-current-branch', async (_, repoPath: string) => {
    if (!repoPath) return { error: 'No repo path' };
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
      return { branch: stdout.trim() };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-diff-branches', async (_, repoPath: string, b1: string, b2: string) => {
    if (!repoPath) return { error: 'No repo path' };
    try {
      const { stdout } = await execAsync(`git diff "${b1}".."${b2}" --unified=3 --no-color`, { cwd: repoPath });
      return { diff: stdout };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-pull', async (_, repoPath: string) => {
    if (!repoPath) return { error: 'No repo path' };
    try {
      const { stdout, stderr } = await execAsync('git fetch && git pull', { cwd: repoPath });
      return { success: true, output: stdout + stderr };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-find-conflicts', async (_, repoPath: string) => {
    if (!repoPath) return { error: 'No repo path' };
    const conflictFiles: string[] = [];
    function walk(dir: string) {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.startsWith('.')) continue;
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!['node_modules', 'dist', 'out', '.git'].includes(entry.name)) walk(p);
          } else {
            try { const c = fs.readFileSync(p, 'utf8'); if (c.includes('<<<<<<<')) conflictFiles.push(p); } catch { /**/ }
          }
        }
      } catch { /**/ }
    }
    walk(repoPath);
    return { conflictFiles };
  });

  ipcMain.handle('resolve-conflict-file', async (_, filePath: string, resolvedContent: string) => {
    try {
      fs.writeFileSync(filePath, resolvedContent, 'utf8');
      await execAsync(`git add "${filePath}"`, { cwd: path.dirname(filePath) }).catch(() => {});
      return { success: true };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('get-cert-expiry', async (_, certPath: string) => {
    try {
      const { stdout } = await execAsync(`openssl x509 -noout -enddate -in "${certPath}"`);
      const match = stdout.match(/notAfter=(.+)/);
      if (match) return { expiresAt: new Date(match[1].trim()).toISOString() };
      return { error: 'Could not parse expiry' };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('export-backup', async (_, secrets: unknown[], password: string) => {
    if (!password) return { error: 'Password required' };
    const win = getWindow();
    if (!win) return { error: 'No window' };
    const r = await dialog.showSaveDialog(win, { title: 'Export VaultCore Backup', defaultPath: 'vaultcore-backup.enc', filters: [{ name: 'Encrypted Backup', extensions: ['enc'] }] });
    if (r.canceled || !r.filePath) return { canceled: true };
    try {
      const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), secrets });
      const salt = crypto.randomBytes(16);
      const key = crypto.scryptSync(password, salt, 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
      fs.writeFileSync(r.filePath, Buffer.concat([salt, iv, encrypted]));
      return { success: true, filePath: r.filePath };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('import-backup', async (_, password: string) => {
    const win = getWindow();
    if (!win) return { error: 'No window' };
    const r = await dialog.showOpenDialog(win, { title: 'Import VaultCore Backup', filters: [{ name: 'Encrypted Backup', extensions: ['enc'] }], properties: ['openFile'] });
    if (r.canceled || r.filePaths.length === 0) return { canceled: true };
    try {
      const buf = fs.readFileSync(r.filePaths[0]);
      const salt = buf.slice(0, 16), iv = buf.slice(16, 32), enc = buf.slice(32);
      const key = crypto.scryptSync(password, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return { success: true, data: JSON.parse(dec.toString('utf8')) };
    } catch { return { error: 'Decryption failed — wrong password or corrupt file' }; }
  });

  ipcMain.handle('credvault-read', async () => {
    try {
      // ecosystemBus is not available here — handled in main.ts
      return { success: true, data: {} };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('credvault-push', async (_, _entries: unknown[]) => {
    return { success: true };
  });
}
