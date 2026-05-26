export type ThemeId = 'stealth' | 'terminal' | 'cyberpunk' | 'graphite' | 'oled' | 'threat';
export type PanelId = 'chat' | 'commands' | 'reverseshell' | 'encoder' | 'cheatsheets' | 'labtracker' | 'progress' | 'snippets' | 'writeup' | 'settings';
export type Platform = 'HTB' | 'THM' | 'CTF' | 'Other';
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane' | '';
export type LabType = 'HTB/THM Linux' | 'HTB/THM Windows' | 'CTF' | 'Cisco/Networking' | 'Web App' | 'OSINT/CTF' | 'Other';

export interface Finding {
  id: string;
  value: string;
  addedAt: string;
  validated?: boolean;
}

export interface SessionFindings {
  ports: Finding[];
  users: Finding[];
  credentials: Finding[];
  flags: Finding[];
  cves: Finding[];
  files: Finding[];
  hashes: Finding[];
  services: Finding[];
  notes: string;
}

export interface SessionMethodology {
  phases: string[];
  completed: string[];
  activePhase: string | null;
}

export interface SessionTimer {
  enabled: boolean;
  totalSeconds: number;
  elapsed: number;
  running: boolean;
  overtime: boolean;
}

export interface SessionMistakes {
  repeatedCommands: Record<string, number>;
  skippedSteps: string[];
  hintEscalations: Record<string, number>;
  methodologyBreaks: Array<{ phase: string; laterPhases: string[]; at: string }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CommandCopied {
  command: string;
  tool: string;
  timestamp: string;
}

export interface Session {
  id: string;
  name: string;
  labName: string;
  platform: Platform;
  difficulty: Difficulty;
  labType: LabType;
  isOsint: boolean;
  startTime: number;
  endTime: number | null;
  durationMinutes: number;
  target: { ip: string; hostname: string; os: string; notes: string };
  targetIp: string;
  targetHostname: string;
  targetOs: string;
  notesList: string[];
  findings: SessionFindings;
  methodology: SessionMethodology;
  hintLevel: number;
  teachMeMode: boolean;
  usedTeachMe: boolean;
  chat: ChatMessage[];
  toolsUsed: string[];
  commandsCopied: CommandCopied[];
  terminalOutputs: string[];
  timer: SessionTimer;
  examMode: boolean;
  complete: boolean;
  mistakes: SessionMistakes;
  createdAt: string;
  updatedAt: string;
}

export interface Tab {
  id: string;
  session: Session;
  chatHistory: ChatMessage[];
  activePanel: PanelId;
  vpnStatus?: { status: string; interface?: string; ip?: string };
}

export interface AppConfig {
  theme: ThemeId;
  obsidianVault: string;
  outputDir: string;
  vpnCheckEnabled: boolean;
  autosaveEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
  operatorName: string;
  htbApiKey?: string;
  thmUsername?: string;
  apiKeyConfigured?: boolean;
  setupComplete?: boolean;
}

export interface ProgressData {
  skillTree: Record<string, string[]>;
  achievements: string[];
  totalXP: number;
  stats: Record<string, number>;
}

export interface KanbanCard {
  id: string;
  name: string;
  platform: string;
  difficulty: string;
  ip: string;
  url: string;
  notes: string;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface LabsData {
  columns: {
    backlog: KanbanColumn;
    inprogress: KanbanColumn;
    completed: KanbanColumn;
    abandoned: KanbanColumn;
  };
}

export interface Snippet {
  id: string;
  trigger: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface VpnStatus {
  status: 'active' | 'off' | 'unknown';
  interface?: string;
  ip?: string;
}
