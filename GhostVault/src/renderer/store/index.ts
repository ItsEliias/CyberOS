import { create } from 'zustand';
import type {
  GhostVaultConfig, NoteFile, ActiveNote,
  EditorMode, ViewId, AiCtx, OllamaStatus
} from '@shared/types';

export type LayoutMode = '1col' | '2col' | '3col';

export interface NoteVersion {
  timestamp: number;
  content: string;
}

interface GhostVaultStore {
  config       : GhostVaultConfig | null;
  vaultPath    : string | null;
  notes        : NoteFile[];
  folders      : string[];
  activeNote   : ActiveNote | null;
  editorContent: string;
  editorMode   : EditorMode;
  dirty        : boolean;
  searchQuery  : string;
  pinnedPaths  : Set<string>;
  alwaysOnTop  : boolean;
  activeView   : ViewId;
  ollamaStatus : OllamaStatus | null;
  aiCtx        : AiCtx;
  ollamaModel  : string;
  version      : string;
  layoutMode   : LayoutMode;
  showPreview  : boolean;
  showHistory  : boolean;
  selectedPaths: Set<string>;
  presentMode  : boolean;
  presentTheme : 'dark' | 'light';
  noteOrder    : string[];
  lockedNotes  : Set<string>;

  setConfig       : (c: GhostVaultConfig) => void;
  setVaultPath    : (p: string | null) => void;
  setNotes        : (n: NoteFile[]) => void;
  setFolders      : (f: string[]) => void;
  setActiveNote   : (n: ActiveNote | null) => void;
  setEditorContent: (c: string) => void;
  setEditorMode   : (m: EditorMode) => void;
  setDirty        : (d: boolean) => void;
  setSearchQuery  : (q: string) => void;
  setPinnedPaths  : (p: Set<string>) => void;
  setAlwaysOnTop  : (v: boolean) => void;
  setActiveView   : (v: ViewId) => void;
  setOllamaStatus : (s: OllamaStatus | null) => void;
  setAiCtx        : (c: AiCtx) => void;
  setOllamaModel  : (m: string) => void;
  setVersion      : (v: string) => void;
  togglePin       : (path: string) => void;
  setLayoutMode   : (m: LayoutMode) => void;
  setShowPreview  : (v: boolean) => void;
  setShowHistory  : (v: boolean) => void;
  toggleSelection : (path: string) => void;
  clearSelection  : () => void;
  setPresentMode  : (v: boolean) => void;
  setPresentTheme : (t: 'dark' | 'light') => void;
  setNoteOrder    : (order: string[]) => void;
  toggleLocked    : (path: string) => void;
}

export const useStore = create<GhostVaultStore>((set) => ({
  config       : null,
  vaultPath    : null,
  notes        : [],
  folders      : [],
  activeNote   : null,
  editorContent: '',
  editorMode   : 'split',
  dirty        : false,
  searchQuery  : '',
  pinnedPaths  : new Set(),
  alwaysOnTop  : false,
  activeView   : 'notes',
  ollamaStatus : null,
  aiCtx        : 'work',
  ollamaModel  : 'mistral',
  version      : '',
  layoutMode   : '2col',
  showPreview  : false,
  showHistory  : false,
  selectedPaths: new Set(),
  presentMode  : false,
  presentTheme : 'dark',
  noteOrder    : [],
  lockedNotes  : new Set(),

  setConfig        : (config)        => set({ config }),
  setVaultPath     : (vaultPath)     => set({ vaultPath }),
  setNotes         : (notes)         => set({ notes }),
  setFolders       : (folders)       => set({ folders }),
  setActiveNote    : (activeNote)    => set({ activeNote }),
  setEditorContent : (editorContent) => set({ editorContent }),
  setEditorMode    : (editorMode)    => set({ editorMode }),
  setDirty         : (dirty)         => set({ dirty }),
  setSearchQuery   : (searchQuery)   => set({ searchQuery }),
  setPinnedPaths   : (pinnedPaths)   => set({ pinnedPaths: new Set(pinnedPaths) }),
  setAlwaysOnTop   : (alwaysOnTop)   => set({ alwaysOnTop }),
  setActiveView    : (activeView)    => set({ activeView }),
  setOllamaStatus  : (ollamaStatus)  => set({ ollamaStatus }),
  setAiCtx         : (aiCtx)         => set({ aiCtx }),
  setOllamaModel   : (ollamaModel)   => set({ ollamaModel }),
  setVersion       : (version)       => set({ version }),
  togglePin        : (path) => set(s => {
    const next = new Set(s.pinnedPaths);
    if (next.has(path)) next.delete(path); else next.add(path);
    return { pinnedPaths: next };
  }),
  setLayoutMode    : (layoutMode)    => set({ layoutMode }),
  setShowPreview   : (showPreview)   => set({ showPreview }),
  setShowHistory   : (showHistory)   => set({ showHistory }),
  toggleSelection  : (path) => set(s => {
    const next = new Set(s.selectedPaths);
    if (next.has(path)) next.delete(path); else next.add(path);
    return { selectedPaths: next };
  }),
  clearSelection   : ()              => set({ selectedPaths: new Set() }),
  setPresentMode   : (presentMode)   => set({ presentMode }),
  setPresentTheme  : (presentTheme)  => set({ presentTheme }),
  setNoteOrder     : (noteOrder)     => set({ noteOrder }),
  toggleLocked     : (path) => set(s => {
    const next = new Set(s.lockedNotes);
    if (next.has(path)) next.delete(path); else next.add(path);
    return { lockedNotes: next };
  }),
}));
