// TerminalLink — renderer-side types

export type SessionColor =
  | '#00ff41' | '#ff4444' | '#4a9eff' | '#e3b341'
  | '#b44fff' | '#56d4dd' | '#ff8c00' | '#ffffff';

export type TerminalThemeName = 'default' | 'matrix' | 'dracula' | 'solarized' | 'monokai';

export interface TerminalSession {
  id: string
  name: string
  linkedLabSession?: string
  targetName?: string
  targetIP?: string
  startedAt: string
  commandCount: number
  color?: SessionColor
  theme?: TerminalThemeName
}

export interface SharedContext {
  activeLab?: string
  activeTarget?: string
  activeIP?: string
  sessions?: string[]
}

export interface AppTheme {
  accentColor: string  // Default: '#00ff41'
  bgColor: string      // Default: '#0a0a0f'
  textColor: string    // Default: '#e2e8f0'
}

export const APP_THEME_PRESETS: Record<string, AppTheme> = {
  dark:     { accentColor: '#00ff41', bgColor: '#0a0a0f',  textColor: '#e2e8f0' },
  graphite: { accentColor: '#00ff41', bgColor: '#111218',  textColor: '#e2e8f0' },
  navy:     { accentColor: '#00ff41', bgColor: '#0a0f1a',  textColor: '#e2e8f0' },
  oled:     { accentColor: '#00ff41', bgColor: '#000000',  textColor: '#e2e8f0' },
}

export const ACCENT_SWATCHES = [
  '#00ff41', '#4a9eff', '#3fb950', '#d29922', '#b44fff', '#f78166',
] as const

export interface ExternalShellHookSettings {
  /** Master switch for capture from external terminals. Default false. */
  enabled: boolean
  /** Which shells we currently inject the hook into. */
  shells: Array<'zsh' | 'bash' | 'fish'>
}

export interface TerminalSettings {
  shellPath: string
  fontSize: number
  cursorStyle: 'block' | 'underline' | 'bar'
  scrollbackLines: number
  autoInjectTarget: boolean
  showContextBar: boolean
  autoLinkSession: boolean
  maxHistoryEntries: number
  outputAlerts: OutputAlertRule[]
  keybindings: KeybindingMap
  ollamaUrl: string
  ollamaEnabled: boolean
  snippetsOpen: boolean
  appTheme: AppTheme
  externalShellHook: ExternalShellHookSettings
}

export type ActiveView = 'terminal' | 'sessions' | 'settings'

export interface Snippet {
  id: string
  title: string
  command: string
  category: string
  shortcut?: string
}

export interface SshProfile {
  id: string
  name: string
  host: string
  port: number
  username: string
  identityFile?: string
  options?: string
}

export interface OutputAlertRule {
  id: string
  pattern: string
  label: string
  notificationType: 'visual' | 'audio' | 'system'
  enabled: boolean
}

export interface KeybindingMap {
  newSession: string
  closeTab: string
  nextTab: string
  prevTab: string
  splitView: string
  toggleBroadcast: string
  toggleHistory: string
  commandPalette: string
  terminalSearch: string
}

export interface RecordedEvent {
  ts: number
  data: string
}

export interface RecordedSession {
  id: string
  sessionId: string
  sessionName: string
  startedAt: string
  endedAt?: string
  events: RecordedEvent[]
}

export interface PentestTool {
  id: string
  name: string
  binary: string
  description: string
  args?: string
}

export const PENTEST_TOOLS: PentestTool[] = [
  { id: 'nmap',       name: 'nmap',       binary: 'nmap',       description: 'Network mapper',       args: '-sV -sC {target}' },
  { id: 'gobuster',   name: 'gobuster',   binary: 'gobuster',   description: 'Dir/DNS brute-forcer',  args: 'dir -u {url} -w /usr/share/wordlists/dirb/common.txt' },
  { id: 'ffuf',       name: 'ffuf',       binary: 'ffuf',       description: 'Web fuzzer',            args: '-w wordlist.txt -u {url}/FUZZ' },
  { id: 'sqlmap',     name: 'sqlmap',     binary: 'sqlmap',     description: 'SQL injection tool',    args: '-u "{url}" --dbs' },
  { id: 'burpsuite',  name: 'burpsuite',  binary: 'burpsuite',  description: 'Web proxy',             args: '' },
  { id: 'metasploit', name: 'metasploit', binary: 'msfconsole', description: 'Exploit framework',    args: '-q' },
  { id: 'john',       name: 'john',       binary: 'john',       description: 'Password cracker',     args: '--wordlist=/usr/share/wordlists/rockyou.txt hash.txt' },
  { id: 'hashcat',    name: 'hashcat',    binary: 'hashcat',    description: 'GPU hash cracker',     args: '-m 0 hash.txt rockyou.txt' },
  { id: 'wireshark',  name: 'wireshark',  binary: 'wireshark',  description: 'Packet analyzer',      args: '&' },
  { id: 'netcat',     name: 'netcat',     binary: 'nc',         description: 'TCP toolkit',          args: '-lvnp {port}' },
]
