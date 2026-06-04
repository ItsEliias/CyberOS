// GhostVault — Type definitions (spec-required path: src/renderer/types/ghostvault.ts)
// Re-exports all shared types plus renderer-specific additions

export type {
  VaultNote,
  SearchResult,
  TagStats,
  Template,
  GhostVaultConfig,
  NoteFile,
} from '../../shared/types';

// SharedContext — runtime context from cybertools-config.json
// (shared_context.activeLab / activeTarget / activeIP per spec)
export interface SharedContext {
  currentLab:   string | null;
  activeTarget: string | null;
  activeIP:     string | null;
}

// VaultState — spec-defined shape for useVaultStore
export interface VaultState {
  vaultPath:         string | null;
  notes:             NoteFile[];
  tags:              import('../../shared/types').TagStats[];
  isLoading:         boolean;

  // Current note
  activeNote:        NoteFile | null;
  activeNoteContent: string;
  isDirty:           boolean;

  // Ecosystem context
  sharedContext:     SharedContext | null;

  // UI
  activeView:        'notes' | 'search' | 'tags' | 'browse' | 'templates' | 'ai' | 'settings';
  searchQuery:       string;
  searchResults:     import('../../shared/types').SearchResult[];

  // Actions
  loadNotes:         () => Promise<void>;
  openNote:          (path: string) => Promise<void>;
  saveNote:          () => Promise<void>;
  createNote:        (path: string, content: string, tags: string[]) => Promise<void>;
  deleteNote:        (path: string) => Promise<void>;
  search:            (query: string) => Promise<void>;
  loadSharedContext: () => Promise<void>;
}

// CaptureState — spec-defined shape for useCaptureStore
export interface CaptureState {
  content:              string;
  tags:                 string[];
  savePath:             string;
  clipboardWatchActive: boolean;
  lastClipboardContent: string;
  sessionContext:       SharedContext | null;
  isSaving:             boolean;

  setContent:           (content: string) => void;
  addTag:               (tag: string) => void;
  removeTag:            (tag: string) => void;
  setSavePath:          (path: string) => void;
  toggleClipboardWatch: () => void;
  save:                 () => Promise<void>;
  loadSessionContext:   () => Promise<void>;
}
