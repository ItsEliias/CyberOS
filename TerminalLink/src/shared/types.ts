export interface CommandEntry {
  id: string
  timestamp: string
  command: string
  outputSnippet?: string   // first 200 chars of output
  pane: 1 | 2
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
