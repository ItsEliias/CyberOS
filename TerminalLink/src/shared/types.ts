export interface CommandEntry {
  id: string
  sessionId?: string       // session this command belongs to
  timestamp: string
  command: string
  outputSnippet?: string   // first 200 chars of output
  pane: 'left' | 'right'
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
