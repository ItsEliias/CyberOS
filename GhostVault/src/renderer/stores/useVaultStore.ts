// useVaultStore — spec-aligned store with full VaultState actions
// Wraps the core useStore and exposes spec-canonical action names
// so both the spec API and internal components work seamlessly.

import { create } from 'zustand';
import type { NoteFile, SearchResult, TagStats } from '@shared/types';

interface SharedContext {
  currentLab:   string | null;
  activeTarget: string | null;
  activeIP:     string | null;
}

interface VaultState {
  vaultPath:         string | null;
  notes:             NoteFile[];
  tags:              TagStats[];
  isLoading:         boolean;

  activeNote:        NoteFile | null;
  activeNoteContent: string;
  isDirty:           boolean;

  sharedContext:     SharedContext | null;

  activeView:        'notes' | 'search' | 'tags' | 'browse' | 'templates' | 'ai' | 'settings';
  searchQuery:       string;
  searchResults:     SearchResult[];

  // Internal setters (also used by App.tsx)
  setVaultPath:    (p: string | null) => void;
  setNotes:        (n: NoteFile[]) => void;
  setActiveNote:   (n: NoteFile | null) => void;
  setActiveNoteContent: (c: string) => void;
  setIsDirty:      (d: boolean) => void;
  setActiveView:   (v: VaultState['activeView']) => void;
  setSearchQuery:  (q: string) => void;
  setSearchResults:(r: SearchResult[]) => void;
  setSharedContext:(ctx: SharedContext | null) => void;
  setIsLoading:    (v: boolean) => void;

  // Spec-defined actions
  loadNotes:         () => Promise<void>;
  openNote:          (path: string) => Promise<void>;
  saveNote:          () => Promise<void>;
  createNote:        (path: string, content: string, tags: string[]) => Promise<void>;
  deleteNote:        (path: string) => Promise<void>;
  search:            (query: string) => Promise<void>;
  loadSharedContext: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaultPath:         null,
  notes:             [],
  tags:              [],
  isLoading:         false,
  activeNote:        null,
  activeNoteContent: '',
  isDirty:           false,
  sharedContext:     null,
  activeView:        'notes',
  searchQuery:       '',
  searchResults:     [],

  setVaultPath:         (vaultPath)         => set({ vaultPath }),
  setNotes:             (notes)             => set({ notes }),
  setActiveNote:        (activeNote)        => set({ activeNote }),
  setActiveNoteContent: (activeNoteContent) => set({ activeNoteContent }),
  setIsDirty:           (isDirty)           => set({ isDirty }),
  setActiveView:        (activeView)        => set({ activeView }),
  setSearchQuery:       (searchQuery)       => set({ searchQuery }),
  setSearchResults:     (searchResults)     => set({ searchResults }),
  setSharedContext:     (sharedContext)     => set({ sharedContext }),
  setIsLoading:         (isLoading)         => set({ isLoading }),

  loadNotes: async () => {
    const { vaultPath } = get();
    if (!vaultPath) return;
    set({ isLoading: true });
    try {
      const { notes } = await window.ghostvault.loadVault(vaultPath);
      // Derive tag stats from loaded notes
      const tagCounts: Record<string, number> = {};
      for (const note of notes) {
        for (const tag of note.tags || []) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      const tags: TagStats[] = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      set({ notes, tags });
    } finally {
      set({ isLoading: false });
    }
  },

  openNote: async (path: string) => {
    const { notes } = get();
    const note = notes.find(n => n.path === path);
    if (!note) return;
    set({ isLoading: true });
    try {
      const content = await window.ghostvault.readNote(path);
      set({ activeNote: note, activeNoteContent: content, isDirty: false });
    } finally {
      set({ isLoading: false });
    }
  },

  saveNote: async () => {
    const { activeNote, activeNoteContent } = get();
    if (!activeNote) return;
    await window.ghostvault.saveNote(activeNote.path, activeNoteContent);
    set({ isDirty: false });
    await get().loadNotes();
  },

  createNote: async (path: string, content: string, tags: string[]) => {
    const tagFrontmatter = tags.length
      ? `---\ntags: [${tags.join(', ')}]\n---\n\n`
      : '';
    await window.ghostvault.writeNote(path, tagFrontmatter + content);
    await get().loadNotes();
  },

  deleteNote: async (path: string) => {
    await window.ghostvault.deleteNote(path);
    const { activeNote } = get();
    if (activeNote?.path === path) {
      set({ activeNote: null, activeNoteContent: '', isDirty: false });
    }
    await get().loadNotes();
  },

  search: async (query: string) => {
    const { vaultPath, notes } = get();
    if (!query.trim() || !vaultPath) {
      set({ searchResults: [] });
      return;
    }
    set({ isLoading: true, searchQuery: query });
    try {
      const lower = query.toLowerCase();
      const results: SearchResult[] = [];
      for (const note of notes) {
        try {
          const content = await window.ghostvault.readNote(note.path);
          const idx = content.toLowerCase().indexOf(lower);
          if (idx !== -1 || note.name.toLowerCase().includes(lower)) {
            const start = Math.max(0, idx - 30);
            const text = content.slice(start, idx + lower.length + 80);
            results.push({
              note,
              matches: [{ line: 0, text, highlight: [idx - start, idx - start + lower.length] }],
              score: note.name.toLowerCase().includes(lower) ? 2 : 1,
            });
          }
        } catch { /* skip unreadable files */ }
        if (results.length >= 50) break;
      }
      results.sort((a, b) => b.score - a.score);
      set({ searchResults: results });
    } finally {
      set({ isLoading: false });
    }
  },

  loadSharedContext: async () => {
    try {
      const ctx = await window.ghostvault.getSessionContext();
      set({ sharedContext: ctx });
    } catch { /* silent fail */ }
  },
}));

// Also re-export useStore from the core store for backward compat with App.tsx
export { useStore } from '../store';
