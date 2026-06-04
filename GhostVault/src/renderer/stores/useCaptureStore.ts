import { create } from 'zustand';

interface SharedContext {
  currentLab: string | null;
  activeTarget: string | null;
  activeIP: string | null;
}

interface CaptureState {
  content: string;
  tags: string[];
  savePath: string;
  clipboardWatchActive: boolean;
  lastClipboardContent: string;
  sessionContext: SharedContext | null;
  isSaving: boolean;
  savedPath: string | null;

  setContent: (content: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setSavePath: (path: string) => void;
  toggleClipboardWatch: () => void;
  setSessionContext: (ctx: SharedContext | null) => void;
  setIsSaving: (v: boolean) => void;
  setSavedPath: (p: string | null) => void;
  reset: () => void;

  save: (folder: string, title: string) => Promise<{ ok: boolean; error?: string }>;
  loadSessionContext: () => Promise<void>;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  content: '',
  tags: [],
  savePath: 'Notes',
  clipboardWatchActive: false,
  lastClipboardContent: '',
  sessionContext: null,
  isSaving: false,
  savedPath: null,

  setContent: (content) => set({ content }),
  addTag: (tag) => set(s => ({ tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag] })),
  removeTag: (tag) => set(s => ({ tags: s.tags.filter(t => t !== tag) })),
  setSavePath: (savePath) => set({ savePath }),
  toggleClipboardWatch: () => set(s => ({ clipboardWatchActive: !s.clipboardWatchActive })),
  setSessionContext: (sessionContext) => set({ sessionContext }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setSavedPath: (savedPath) => set({ savedPath }),
  reset: () => set({ content: '', tags: [], savedPath: null }),

  save: async (folder: string, title: string) => {
    const { content } = get();
    if (!content.trim()) return { ok: false, error: 'No content' };
    set({ isSaving: true });
    try {
      const result = await window.ghostvault.saveCaptureNote({ folder, title, text: content });
      if (result.ok) set({ savedPath: result.path || null });
      return result;
    } finally {
      set({ isSaving: false });
    }
  },

  loadSessionContext: async () => {
    try {
      const ctx = await window.ghostvault.getSessionContext();
      set({ sessionContext: ctx });
      if (ctx) {
        const tags: string[] = [];
        if (ctx.currentLab) tags.push('lab');
        if (ctx.activeTarget) tags.push('target');
        set(s => ({ tags: [...new Set([...s.tags, ...tags])] }));
      }
    } catch { /* ignore */ }
  },
}));
