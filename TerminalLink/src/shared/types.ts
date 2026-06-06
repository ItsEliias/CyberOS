export interface CommandEntry {
  id: string
  sessionId?: string       // session this command belongs to
  timestamp: string
  command: string
  outputSnippet?: string   // first 200 chars of output
  pane: 'left' | 'right'
  /** Where the command originated. Defaults to in-app pane input. */
  source?: 'pane' | 'external'
  /** External-only: the shell the command was captured from. */
  externalShell?: string
  /** External-only: the working directory at capture time. */
  externalCwd?: string
}

export type ExternalShellId = 'zsh' | 'bash' | 'fish'

export interface ExternalHookStatus {
  /** Path being tailed for new JSONL entries. */
  logPath: string
  /** ISO timestamp of the most recent line we ingested. */
  lastSeenAt: string | null
  /** Whether the tail watcher is currently active. */
  tailing: boolean
  /** Per-shell installation status (true = marker block present in rc file). */
  installed: Record<ExternalShellId, boolean>
  /** Any non-fatal errors collected during last install/uninstall/tail attempt. */
  lastError?: string
}

export interface TerminalSession {
  id: string
  createdAt: string
  linkedLabSession?: string
  linkedTarget?: string
  commandLog: CommandEntry[]
}

export interface SessionContext {
  activeLab?: string
  activeTarget?: string
  activeIP?: string
  sessions?: string[]
}

export interface EcosystemEvent {
  app: string
  event: string
  data: Record<string, unknown>
  timestamp: string
  id: string
}

export interface CapturePayload {
  imageData: string                        // base64 data URL
  label: string
  destination: 'ghostvault' | 'downloads'
}

export interface CaptureResult {
  ok: boolean
  path: string
}
