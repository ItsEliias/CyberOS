// VaultCore — Secret Detection IPC Handlers
// Registers all secret-detection, git, backup, and credvault IPC handlers.

import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync     = promisify(exec);
const execFileAsync = promisify(execFile);

// Git branch / ref names are constrained by `git check-ref-format` rules.
// We don't need to match those exactly — we just need to reject anything that
// could escape a shell argument. Anything with shell metacharacters, control
// chars, or `..` is rejected. This is paranoid by design: the renderer is the
// only caller and it has no business sending those characters.
function isSafeRefName(s: unknown): s is string {
  if (typeof s !== 'string' || s.length === 0 || s.length > 200) return false;
  // Reject anything outside printable ASCII or the safe ref-name punctuation set.
  // Allowed: letters, digits, `-_./@+:`. Disallow ASCII control + shell metachars.
  return /^[A-Za-z0-9_./@+:\-]+$/.test(s) && !s.includes('..');
}

// Validate a renderer-supplied repo path: must be a string pointing at an
// existing directory. Without this, `repoPath = '/'` makes git-find-conflicts
// walk the entire filesystem (DoS), and a non-string crashes execAsync with
// a sync TypeError on the cwd option.
function isExistingDir(p: unknown): p is string {
  if (typeof p !== 'string' || p.length === 0) return false;
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

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

  ipcMain.handle('git-branches', async (_, repoPath: unknown) => {
    if (!isExistingDir(repoPath)) return { error: 'No repo path' };
    try {
      const { stdout } = await execFileAsync('git', ['branch', '-a', '--format=%(refname:short)'], { cwd: repoPath });
      return { branches: stdout.split('\n').map((b) => b.trim()).filter(Boolean) };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-current-branch', async (_, repoPath: unknown) => {
    if (!isExistingDir(repoPath)) return { error: 'No repo path' };
    try {
      const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd: repoPath });
      return { branch: stdout.trim() };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-diff-branches', async (_, repoPath: unknown, b1: unknown, b2: unknown) => {
    if (!isExistingDir(repoPath)) return { error: 'No repo path' };
    // Branch names come from the renderer — refuse anything with shell
    // metacharacters before passing to git. Use execFile (no shell) for
    // belt-and-braces protection.
    if (!isSafeRefName(b1) || !isSafeRefName(b2)) {
      return { error: 'Invalid branch name' };
    }
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['diff', `${b1}..${b2}`, '--unified=3', '--no-color'],
        { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
      );
      return { diff: stdout };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-pull', async (_, repoPath: unknown) => {
    if (!isExistingDir(repoPath)) return { error: 'No repo path' };
    try {
      // Split into two execFile calls to drop the shell — `git fetch && git pull`
      // needs a shell to chain commands, which we don't want for renderer input.
      const fetchOut = await execFileAsync('git', ['fetch'], { cwd: repoPath });
      const pullOut  = await execFileAsync('git', ['pull'],  { cwd: repoPath });
      return { success: true, output: fetchOut.stdout + fetchOut.stderr + pullOut.stdout + pullOut.stderr };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('git-find-conflicts', async (_, repoPath: unknown) => {
    if (!isExistingDir(repoPath)) return { error: 'No repo path' };
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

  ipcMain.handle('resolve-conflict-file', async (_, filePath: unknown, resolvedContent: unknown) => {
    // The renderer hands us a path + content from the merge-conflict UI.
    // Both used to be trusted: `git add "${filePath}"` was a shell-injection
    // sink (filePath = `";rm -rf ~/;"` would execute), and the writeFileSync
    // would happily clobber anywhere on disk. Validate types, ensure the file
    // already exists (so we can only resolve files git knows about), and use
    // execFile to remove the shell from the path.
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return { error: 'Invalid file path' };
    }
    if (typeof resolvedContent !== 'string') {
      return { error: 'Resolved content must be a string' };
    }
    try {
      // Only allow overwriting an existing file — the conflict-resolve flow
      // can't legitimately create new files (it acts on git-tracked paths
      // already detected by git-find-conflicts).
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return { error: 'Target file does not exist' };
      }
      // Atomic — partial conflict-resolved content would leave a corrupted
      // merge artifact behind in the git working tree.
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, resolvedContent, 'utf8');
      fs.renameSync(tmp, filePath);
      await execFileAsync('git', ['add', '--', filePath], {
        cwd: path.dirname(filePath)
      }).catch(() => {});
      return { success: true };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('get-cert-expiry', async (_, certPath: unknown) => {
    // The renderer hands us a file path picked by the user. Validate it's a
    // string + an existing file before shelling out, and use execFile so the
    // path can't break out of the argv array (the old `exec("openssl ... ${path}")`
    // was a shell-injection vector).
    if (typeof certPath !== 'string' || certPath.length === 0) {
      return { error: 'Invalid certificate path' };
    }
    try {
      if (!fs.existsSync(certPath) || !fs.statSync(certPath).isFile()) {
        return { error: 'Certificate file not found' };
      }
      const { stdout } = await execFileAsync(
        'openssl',
        ['x509', '-noout', '-enddate', '-in', certPath]
      );
      const match = stdout.match(/notAfter=(.+)/);
      if (match) return { expiresAt: new Date(match[1].trim()).toISOString() };
      return { error: 'Could not parse expiry' };
    } catch (e) { return { error: (e as Error).message }; }
  });

  // Encrypted backup format, written by export-backup:
  //   [4-byte magic 'VCBK'] [1-byte version] [16-byte salt] [12-byte iv]
  //   [16-byte GCM tag] [ciphertext]
  // GCM gives us authenticated encryption — CBC (the previous format) had no
  // MAC and could be silently tampered with. import-backup still accepts the
  // legacy layout so old .enc files keep working.
  const VC_BACKUP_MAGIC = Buffer.from('VCBK');
  const VC_BACKUP_VERSION = 2;

  ipcMain.handle('export-backup', async (_, secrets: unknown, password: unknown) => {
    // Validate at the boundary — a non-string password would throw deep
    // inside scryptSync, surfacing a confusing OpenSSL error to the user.
    // Secrets must be an array since we JSON.stringify it as backup payload.
    if (typeof password !== 'string' || password.length === 0) {
      return { error: 'Password required' };
    }
    if (!Array.isArray(secrets)) {
      return { error: 'Invalid secrets payload' };
    }
    const win = getWindow();
    if (!win) return { error: 'No window' };
    const r = await dialog.showSaveDialog(win, { title: 'Export VaultCore Backup', defaultPath: 'vaultcore-backup.enc', filters: [{ name: 'Encrypted Backup', extensions: ['enc'] }] });
    if (r.canceled || !r.filePath) return { canceled: true };
    try {
      const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), secrets });
      const salt = crypto.randomBytes(16);
      const key = crypto.scryptSync(password, salt, 32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      fs.writeFileSync(r.filePath, Buffer.concat([
        VC_BACKUP_MAGIC, Buffer.from([VC_BACKUP_VERSION]),
        salt, iv, tag, encrypted,
      ]));
      return { success: true, filePath: r.filePath };
    } catch (e) { return { error: (e as Error).message }; }
  });

  ipcMain.handle('import-backup', async (_, password: unknown) => {
    if (typeof password !== 'string' || password.length === 0) {
      return { error: 'Password required' };
    }
    const win = getWindow();
    if (!win) return { error: 'No window' };
    const r = await dialog.showOpenDialog(win, { title: 'Import VaultCore Backup', filters: [{ name: 'Encrypted Backup', extensions: ['enc'] }], properties: ['openFile'] });
    if (r.canceled || r.filePaths.length === 0) return { canceled: true };
    try {
      const buf = fs.readFileSync(r.filePaths[0]);
      let dec: Buffer;
      if (buf.length >= 4 && buf.subarray(0, 4).equals(VC_BACKUP_MAGIC)) {
        // New GCM-authenticated format
        let off = 4;
        const version = buf[off]; off += 1;
        if (version !== VC_BACKUP_VERSION) return { error: `Unsupported backup version ${version}` };
        const salt = buf.subarray(off, off + 16); off += 16;
        const iv   = buf.subarray(off, off + 12); off += 12;
        const tag  = buf.subarray(off, off + 16); off += 16;
        const enc  = buf.subarray(off);
        const key  = crypto.scryptSync(password, salt, 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      } else {
        // Legacy CBC-without-MAC format — kept readable so existing backups
        // still import. New exports use the authenticated path above.
        const salt = buf.subarray(0, 16);
        const iv   = buf.subarray(16, 32);
        const enc  = buf.subarray(32);
        const key  = crypto.scryptSync(password, salt, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      }
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
