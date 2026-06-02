export interface GhostVaultConfig {
  vaultPath?: string;
  theme?: ThemeConfig | string;
  editorMode?: 'edit' | 'split' | 'preview';
  alwaysOnTop?: boolean;
  autosave?: boolean;
  pins?: string;
  aiCtx?: AiCtx;
  ollamaModel?: string;
  ollamaEnabled?: boolean;
  useExistingStructure?: boolean;
  captureTheme?: ThemeConfig;
  windowWidth?: number;
  windowHeight?: number;
  windowX?: number;
  windowY?: number;
  firstRun?: boolean;
  captureHotkey?: string;
  labSessionTemplate?: string;
}

export interface CyberLabStatus {
  currentLab?: string;
  activeTarget?: string;
  activeIP?: string;
}

export interface ReconDeskStatus {
  activeTarget?: string;
  activeIP?: string;
}

export interface CyberToolsSharedConfig {
  cyberlab_status?: CyberLabStatus;
  recondesk_status?: ReconDeskStatus;
  ghostvault_status?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThemeConfig {
  core: CoreTheme;
  personality: PersonalityTheme;
}

export type CoreTheme = 'stealth' | 'graphite' | 'frost' | 'oled';
export type PersonalityTheme = 'neutral' | 'cyberpunk' | 'terminal' | 'threat';
export type AiCtx = 'work' | 'cyber' | 'personal';
export type EditorMode = 'edit' | 'split' | 'preview';
export type ViewId = 'notes' | 'capture' | 'vault' | 'templates' | 'settings';

export interface NoteFile {
  name: string;
  filename: string;
  path: string;
  rel: string;
  folder: string;
  mtime: number;
  size: number;
}

export interface ActiveNote extends NoteFile {
  content: string;
}

export interface NewNoteResult {
  path: string;
  name: string;
  folder: string;
  content: string;
}

export interface SaveCaptureResult {
  ok: boolean;
  path?: string;
  name?: string;
  error?: string;
}

export interface OllamaStatus {
  running: boolean;
  models: string[];
}

export interface OllamaFormatResult {
  result?: string;
  error?: string;
}

export interface CaptureTheme {
  core: CoreTheme;
  personality: PersonalityTheme;
}
