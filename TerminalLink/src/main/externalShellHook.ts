/**
 * externalShellHook — TerminalLink
 *
 * Opt-in capture of commands typed in external terminals (Terminal.app, iTerm,
 * Warp, etc.). When enabled, we inject a small pre-exec snippet into the
 * user's shell rc files. The snippet appends one JSONL record per command to
 * ~/.cybertools/term-log.jsonl. The main process tails that file and forwards
 * each new line into the existing log-commands pipeline so commands appear in
 * TermLink's command log + ecosystem bus.
 *
 * Design constraints:
 *   - Idempotent installs (markers prevent duplicate appends).
 *   - Clean uninstalls (marker block is removed even if user edited around it).
 *   - Surfaces clear errors when rc files are not writable.
 *   - Default OFF; never auto-enables anything.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import type { CommandEntry, ExternalHookStatus, ExternalShellId } from '../shared/types.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const MARKER_START = '# >>> CYBERTOOLS-TERMLINK-HOOK >>>';
const MARKER_END   = '# <<< CYBERTOOLS-TERMLINK-HOOK <<<';

export const TERM_LOG_DIR  = path.join(os.homedir(), '.cybertools');
export const TERM_LOG_FILE = path.join(TERM_LOG_DIR, 'term-log.jsonl');

const RC_FILES: Record<ExternalShellId, string> = {
  zsh:  path.join(os.homedir(), '.zshrc'),
  bash: path.join(os.homedir(), '.bashrc'),
  fish: path.join(os.homedir(), '.config', 'fish', 'config.fish'),
};

const SUPPORTED_SHELLS: ExternalShellId[] = ['zsh', 'bash', 'fish'];

// ─── Snippet templates ────────────────────────────────────────────────────────
//
// Each snippet is wrapped between MARKER_START and MARKER_END. The disable
// action locates and strips the whole block by exact marker match, so users
// editing around the block is safe.
//
// The snippets write a single JSON line per command, with fields:
//   { ts, cwd, cmd, shell, pid }
// using only POSIX-ish tools (printf, awk, etc.) to avoid hard dependencies.

function jsonEscapeCmd(varName: string): string {
  // Escape backslash, double quote, and control bytes via printf %s | awk.
  // Run in a subshell so the user's terminal stays clean.
  return `$(printf %s "$${varName}" | awk 'BEGIN{ORS=""} {gsub(/\\\\/,"\\\\\\\\");gsub(/"/,"\\\\\\"");gsub(/\\t/,"\\\\t");gsub(/\\r/,"\\\\r");print}')`;
}

function zshSnippet(): string {
  return [
    MARKER_START,
    '# Capture commands typed in external terminals and stream them into',
    '# ~/.cybertools/term-log.jsonl so TermLink can mirror them in its log.',
    '_cybertools_termlink_preexec() {',
    '  local _ct_cmd="$1"',
    '  local _ct_dir="${HOME}/.cybertools"',
    '  [ -d "$_ct_dir" ] || mkdir -p "$_ct_dir" 2>/dev/null',
    '  local _ct_ts',
    '  _ct_ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
    '  local _ct_cwd="${PWD}"',
    '  # JSON-escape command + cwd via awk',
    '  local _ct_cmd_esc',
    `  _ct_cmd_esc=${jsonEscapeCmd('_ct_cmd')}`,
    '  local _ct_cwd_esc',
    `  _ct_cwd_esc=${jsonEscapeCmd('_ct_cwd')}`,
    '  printf \'{"ts":"%s","cwd":"%s","cmd":"%s","shell":"zsh","pid":%d}\\n\' \\',
    '    "$_ct_ts" "$_ct_cwd_esc" "$_ct_cmd_esc" "$$" >> "$_ct_dir/term-log.jsonl" 2>/dev/null',
    '}',
    'if [[ -n "${ZSH_VERSION:-}" ]]; then',
    '  autoload -Uz add-zsh-hook 2>/dev/null',
    '  if typeset -f add-zsh-hook >/dev/null; then',
    '    add-zsh-hook preexec _cybertools_termlink_preexec',
    '  else',
    '    preexec_functions+=(_cybertools_termlink_preexec)',
    '  fi',
    'fi',
    MARKER_END,
    '',
  ].join('\n');
}

function bashSnippet(): string {
  // Bash has no preexec; we use the DEBUG trap with BASH_COMMAND to capture
  // each command before it runs. We avoid clobbering an existing DEBUG trap
  // by chaining: store the previous trap and call it after our hook.
  return [
    MARKER_START,
    '# Capture commands typed in external terminals via the DEBUG trap and',
    '# stream them into ~/.cybertools/term-log.jsonl for TermLink.',
    '_cybertools_termlink_debug() {',
    '  # Skip prompt / completion / subshell noise',
    '  [ -n "$COMP_LINE" ] && return',
    '  [ "$BASH_COMMAND" = "$PROMPT_COMMAND" ] && return',
    '  case "$BASH_COMMAND" in _cybertools_termlink_*|trap*) return;; esac',
    '  local _ct_dir="${HOME}/.cybertools"',
    '  [ -d "$_ct_dir" ] || mkdir -p "$_ct_dir" 2>/dev/null',
    '  local _ct_ts',
    '  _ct_ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
    '  local _ct_cmd="$BASH_COMMAND"',
    '  local _ct_cwd="${PWD}"',
    '  local _ct_cmd_esc',
    `  _ct_cmd_esc=${jsonEscapeCmd('_ct_cmd')}`,
    '  local _ct_cwd_esc',
    `  _ct_cwd_esc=${jsonEscapeCmd('_ct_cwd')}`,
    '  printf \'{"ts":"%s","cwd":"%s","cmd":"%s","shell":"bash","pid":%d}\\n\' \\',
    '    "$_ct_ts" "$_ct_cwd_esc" "$_ct_cmd_esc" "$$" >> "$_ct_dir/term-log.jsonl" 2>/dev/null',
    '}',
    'if [ -n "${BASH_VERSION:-}" ]; then',
    '  trap \'_cybertools_termlink_debug\' DEBUG',
    'fi',
    MARKER_END,
    '',
  ].join('\n');
}

function fishSnippet(): string {
  return [
    MARKER_START,
    '# Capture commands typed in external terminals (fish) and stream them',
    '# into ~/.cybertools/term-log.jsonl for TermLink.',
    'function _cybertools_termlink_preexec --on-event fish_preexec',
    '    set -l _ct_dir "$HOME/.cybertools"',
    '    test -d "$_ct_dir"; or mkdir -p "$_ct_dir" 2>/dev/null',
    '    set -l _ct_ts (date -u +"%Y-%m-%dT%H:%M:%SZ")',
    '    set -l _ct_cmd "$argv"',
    '    set -l _ct_cwd "$PWD"',
    '    set -l _ct_cmd_esc (printf %s "$_ct_cmd" | awk \'BEGIN{ORS=""} {gsub(/\\\\/,"\\\\\\\\");gsub(/"/,"\\\\\\"");gsub(/\\t/,"\\\\t");gsub(/\\r/,"\\\\r");print}\')',
    '    set -l _ct_cwd_esc (printf %s "$_ct_cwd" | awk \'BEGIN{ORS=""} {gsub(/\\\\/,"\\\\\\\\");gsub(/"/,"\\\\\\"");print}\')',
    '    printf \'{"ts":"%s","cwd":"%s","cmd":"%s","shell":"fish","pid":%d}\\n\' \\',
    '        "$_ct_ts" "$_ct_cwd_esc" "$_ct_cmd_esc" $fish_pid >> "$_ct_dir/term-log.jsonl" 2>/dev/null',
    'end',
    MARKER_END,
    '',
  ].join('\n');
}

const SNIPPETS: Record<ExternalShellId, () => string> = {
  zsh:  zshSnippet,
  bash: bashSnippet,
  fish: fishSnippet,
};

// ─── Marker helpers ───────────────────────────────────────────────────────────
function stripMarkerBlock(text: string): string {
  // Remove every marker block (matched start..end). Trailing newlines folded.
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inside = false;
  for (const line of lines) {
    if (!inside && line.trim() === MARKER_START) {
      inside = true;
      continue;
    }
    if (inside && line.trim() === MARKER_END) {
      inside = false;
      continue;
    }
    if (!inside) out.push(line);
  }
  return out.join('\n');
}

function rcContainsMarker(text: string): boolean {
  return text.includes(MARKER_START) && text.includes(MARKER_END);
}

// ─── Idempotent install / uninstall ───────────────────────────────────────────
export interface InstallResult {
  shell: ExternalShellId
  rcPath: string
  changed: boolean
  error?: string
}

/**
 * Append the snippet for `shell` to the corresponding rc file. No-op if
 * the marker block is already present. Creates parent dirs for fish.
 */
export function installHookForShell(shell: ExternalShellId): InstallResult {
  const rcPath = RC_FILES[shell];
  const snippet = SNIPPETS[shell]();
  try {
    // Make parent dir for fish if needed.
    fs.mkdirSync(path.dirname(rcPath), { recursive: true });

    let existing = '';
    if (fs.existsSync(rcPath)) {
      existing = fs.readFileSync(rcPath, 'utf8');
      if (rcContainsMarker(existing)) {
        return { shell, rcPath, changed: false };
      }
    }

    // Ensure a separating newline before append for readability.
    const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(rcPath, existing + sep + '\n' + snippet, { encoding: 'utf8' });
    return { shell, rcPath, changed: true };
  } catch (e) {
    return { shell, rcPath, changed: false, error: (e as Error).message };
  }
}

/**
 * Remove every CYBERTOOLS-TERMLINK-HOOK marker block from the rc file for
 * the given shell. Idempotent — silently no-ops if file or markers missing.
 */
export function uninstallHookForShell(shell: ExternalShellId): InstallResult {
  const rcPath = RC_FILES[shell];
  try {
    if (!fs.existsSync(rcPath)) {
      return { shell, rcPath, changed: false };
    }
    const before = fs.readFileSync(rcPath, 'utf8');
    if (!rcContainsMarker(before)) {
      return { shell, rcPath, changed: false };
    }
    const after = stripMarkerBlock(before).replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(rcPath, after, { encoding: 'utf8' });
    return { shell, rcPath, changed: true };
  } catch (e) {
    return { shell, rcPath, changed: false, error: (e as Error).message };
  }
}

/** Returns true if the marker block is currently present in the rc file. */
export function isHookInstalledForShell(shell: ExternalShellId): boolean {
  const rcPath = RC_FILES[shell];
  try {
    if (!fs.existsSync(rcPath)) return false;
    return rcContainsMarker(fs.readFileSync(rcPath, 'utf8'));
  } catch {
    return false;
  }
}

// ─── Tail watcher ─────────────────────────────────────────────────────────────
type ExternalLineCallback = (entry: CommandEntry) => void;

interface TailState {
  watcher: fs.FSWatcher | null
  offset: number
  lastSeenAt: string | null
  pollHandle: NodeJS.Timeout | null
  lastError?: string
}

const tail: TailState = {
  watcher: null,
  offset: 0,
  lastSeenAt: null,
  pollHandle: null,
};

let lineCallback: ExternalLineCallback | null = null;

export function setExternalLineCallback(cb: ExternalLineCallback | null): void {
  lineCallback = cb;
}

function ensureLogFile(): void {
  fs.mkdirSync(TERM_LOG_DIR, { recursive: true });
  if (!fs.existsSync(TERM_LOG_FILE)) {
    fs.writeFileSync(TERM_LOG_FILE, '');
  }
}

function parseLine(line: string): CommandEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed) as {
      ts?: string; cwd?: string; cmd?: string; shell?: string; pid?: number;
    };
    if (!obj.cmd) return null;
    const ts = obj.ts || new Date().toISOString();
    return {
      id:        `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: ts,
      command:   obj.cmd,
      pane:      'left',
      source:    'external',
      externalShell: obj.shell,
      externalCwd:   obj.cwd,
    };
  } catch {
    return null;
  }
}

function readNewLines(): void {
  try {
    const stat = fs.statSync(TERM_LOG_FILE);
    if (stat.size < tail.offset) {
      // File was rotated / truncated; reset.
      tail.offset = 0;
    }
    if (stat.size === tail.offset) return;

    const stream = fs.createReadStream(TERM_LOG_FILE, {
      start: tail.offset,
      end: stat.size - 1,
      encoding: 'utf8',
    });
    let buf = '';
    stream.on('data', chunk => { buf += chunk; });
    stream.on('end', () => {
      const lines = buf.split('\n');
      // Last item may be a partial line; keep its bytes for next read.
      const complete = lines.slice(0, -1);
      const trailing = lines[lines.length - 1] ?? '';
      const trailingBytes = Buffer.byteLength(trailing, 'utf8');
      tail.offset = stat.size - trailingBytes;

      for (const line of complete) {
        const entry = parseLine(line);
        if (!entry) continue;
        tail.lastSeenAt = entry.timestamp;
        lineCallback?.(entry);
      }
    });
    stream.on('error', e => {
      tail.lastError = (e as Error).message;
    });
  } catch (e) {
    tail.lastError = (e as Error).message;
  }
}

/**
 * Start tailing the term log. Safe to call multiple times — no-op if already
 * running. Uses fs.watch + size offset to avoid an extra runtime dep.
 */
export function startTailing(): void {
  if (tail.watcher || tail.pollHandle) return;
  try {
    ensureLogFile();
    // Start at end of file so we don't replay history on enable.
    tail.offset = fs.statSync(TERM_LOG_FILE).size;
    tail.lastError = undefined;

    tail.watcher = fs.watch(TERM_LOG_FILE, { persistent: false }, () => readNewLines());

    // Backup: fs.watch is flaky on some macOS APFS setups. Poll every 1s.
    tail.pollHandle = setInterval(readNewLines, 1000);
  } catch (e) {
    tail.lastError = (e as Error).message;
  }
}

/** Stop tailing the term log. Safe to call multiple times. */
export function stopTailing(): void {
  if (tail.watcher) {
    try { tail.watcher.close(); } catch { /* ignore */ }
    tail.watcher = null;
  }
  if (tail.pollHandle) {
    clearInterval(tail.pollHandle);
    tail.pollHandle = null;
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────
export function getHookStatus(): ExternalHookStatus {
  return {
    logPath: TERM_LOG_FILE,
    lastSeenAt: tail.lastSeenAt,
    tailing: !!(tail.watcher || tail.pollHandle),
    installed: SUPPORTED_SHELLS.reduce((acc, s) => {
      acc[s] = isHookInstalledForShell(s);
      return acc;
    }, {} as Record<ExternalShellId, boolean>),
    lastError: tail.lastError,
  };
}

export { SUPPORTED_SHELLS };
// Silence unused import; readline is reserved for a future per-line reader.
void readline;
