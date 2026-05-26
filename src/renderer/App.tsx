import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from './store';
import { localAiProcess } from './lib/local-ai';
import SetupWizard from './components/SetupWizard';
import Sidebar from './components/Sidebar';
import EditorView from './components/EditorView';
import CaptureView from './components/CaptureView';
import VaultView from './components/VaultView';
import TemplatesView from './components/TemplatesView';
import SettingsView from './components/SettingsView';
import {
  NewNoteModal, NewFolderModal, QuickCaptureModal,
  AiOverlay, AiMenu, NoteContextMenu, ToastContainer, useToast,
} from './components/Modals';
import type { AiCtx } from '@shared/types';

export default function App() {
  const {
    vaultPath, activeView,
    setConfig, setVaultPath, setNotes, setFolders, setActiveNote,
    setEditorContent, setDirty, setPinnedPaths, setAlwaysOnTop,
    setActiveView, setOllamaStatus, setAiCtx, setOllamaModel, setVersion,
    togglePin,
  } = useStore();

  const { toasts, addToast, removeToast } = useToast();

  const [showNewNote, setShowNewNote]     = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showCapture, setShowCapture]     = useState(false);
  const [aiMenuOpen, setAiMenuOpen]       = useState(false);
  const [aiOverlay, setAiOverlay]         = useState<{ mode: string; result: string } | null>(null);
  const [contextMenu, setContextMenu]     = useState<{ x: number; y: number; path: string } | null>(null);
  const [ollamaModels, setOllamaModels]   = useState<string[]>([]);
  const [setupDone, setSetupDone]         = useState(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [cfg, ver, aot] = await Promise.all([
        window.ghostvault.getConfig(),
        window.ghostvault.getVersion(),
        window.ghostvault.getAlwaysOnTop(),
      ]);

      setConfig(cfg);
      setVersion(ver);
      setAlwaysOnTop(aot);

      const theme = cfg.theme as { core?: string; personality?: string } | undefined;
      if (theme?.core) document.documentElement.setAttribute('data-core', theme.core);
      if (theme?.personality) document.documentElement.setAttribute('data-personality', theme.personality);

      if (cfg.aiCtx) setAiCtx(cfg.aiCtx as AiCtx);
      if (cfg.ollamaModel) setOllamaModel(cfg.ollamaModel);

      if (cfg.pins) {
        try { setPinnedPaths(new Set(JSON.parse(cfg.pins))); } catch { /* ignore */ }
      }

      if (cfg.vaultPath) {
        setVaultPath(cfg.vaultPath);
        const { notes: n, folders: f } = await window.ghostvault.loadVault(cfg.vaultPath);
        setNotes(n);
        setFolders(f);
        setSetupDone(true);
      }

      const status = await window.ghostvault.getOllamaStatus();
      setOllamaStatus(status);
      setOllamaModels(status?.models || []);
    }
    init();

    const unsubs = [
      window.ghostvault.onOpenCapture(() => setShowCapture(true)),
      window.ghostvault.onAlwaysOnTopChange((v) => setAlwaysOnTop(v)),
      window.ghostvault.onVaultRefresh(async () => {
        const p = useStore.getState().vaultPath;
        if (!p) return;
        const { notes: n, folders: f } = await window.ghostvault.loadVault(p);
        setNotes(n);
        setFolders(f);
      }),
    ];

    function handleKey(e: KeyboardEvent) {
      if (e.metaKey && e.key === 'n') { e.preventDefault(); setShowNewNote(true); }
      if (e.metaKey && e.key === 'p') { e.preventDefault(); setShowCapture(true); }
      if (e.metaKey && e.key === '/') { e.preventDefault(); setAiMenuOpen(v => !v); }
    }
    window.addEventListener('keydown', handleKey);

    return () => {
      unsubs.forEach(u => u());
      window.removeEventListener('keydown', handleKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Vault refresh ──────────────────────────────────────────────────────────
  const refreshVault = useCallback(async () => {
    const p = useStore.getState().vaultPath;
    if (!p) return;
    const { notes: n, folders: f } = await window.ghostvault.loadVault(p);
    setNotes(n);
    setFolders(f);
  }, [setNotes, setFolders]);

  // ── Open note ──────────────────────────────────────────────────────────────
  const openNote = useCallback(async (notePath: string) => {
    const content = await window.ghostvault.readNote(notePath);
    const note    = useStore.getState().notes.find(n => n.path === notePath);
    if (!note) return;
    setActiveNote({ ...note, content });
    setEditorContent(content);
    setDirty(false);
    setActiveView('notes');
  }, [setActiveNote, setEditorContent, setDirty, setActiveView]);

  // ── Save note ──────────────────────────────────────────────────────────────
  const saveNote = useCallback(async () => {
    const { activeNote, editorContent } = useStore.getState();
    if (!activeNote) return;
    await window.ghostvault.saveNote(activeNote.path, editorContent);
    setDirty(false);
    await refreshVault();
  }, [setDirty, refreshVault]);

  // ── Create note ────────────────────────────────────────────────────────────
  const createNote = useCallback(async (folder: string, title: string) => {
    setShowNewNote(false);
    const p = useStore.getState().vaultPath;
    if (!p) { addToast('No vault configured', 'error'); return; }
    const result = await window.ghostvault.newNote(p, folder, title);
    if (!result) { addToast('Failed to create note', 'error'); return; }
    await refreshVault();
    setActiveNote({ ...result, mtime: Date.now(), size: 0, rel: '', filename: result.name });
    setEditorContent(result.content);
    setDirty(false);
    setActiveView('notes');
  }, [refreshVault, setActiveNote, setEditorContent, setDirty, setActiveView, addToast]);

  // ── Create folder ──────────────────────────────────────────────────────────
  const createFolder = useCallback(async (name: string) => {
    setShowNewFolder(false);
    const p = useStore.getState().vaultPath;
    if (!p) return;
    const ok = await window.ghostvault.createFolder(p, name);
    if (ok) await refreshVault();
    else addToast('Failed to create folder', 'error');
  }, [refreshVault, addToast]);

  // ── Delete note ────────────────────────────────────────────────────────────
  const deleteNote = useCallback(async (notePath: string) => {
    setContextMenu(null);
    const ok = await window.ghostvault.deleteNote(notePath);
    if (!ok) { addToast('Delete failed', 'error'); return; }
    const { activeNote } = useStore.getState();
    if (activeNote?.path === notePath) {
      setActiveNote(null);
      setEditorContent('');
    }
    await refreshVault();
  }, [setActiveNote, setEditorContent, refreshVault, addToast]);

  // ── Rename note ────────────────────────────────────────────────────────────
  const renameNote = useCallback(async (oldPath: string, newName: string) => {
    setContextMenu(null);
    const dir     = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${dir}/${newName.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    const ok      = await window.ghostvault.renameNote(oldPath, newPath);
    if (!ok) { addToast('Rename failed', 'error'); return; }
    await refreshVault();
    const { activeNote } = useStore.getState();
    if (activeNote?.path === oldPath) setActiveNote({ ...activeNote, path: newPath, name: newName });
  }, [setActiveNote, refreshVault, addToast]);

  // ── Toggle pin ─────────────────────────────────────────────────────────────
  const handleTogglePin = useCallback(async () => {
    const { activeNote } = useStore.getState();
    if (!activeNote) return;
    togglePin(activeNote.path);
    const { pinnedPaths } = useStore.getState();
    await window.ghostvault.saveConfig({ pins: JSON.stringify([...pinnedPaths]) });
  }, [togglePin]);

  // ── Toggle always-on-top ───────────────────────────────────────────────────
  const handleToggleAot = useCallback(async () => {
    const next = !useStore.getState().alwaysOnTop;
    await window.ghostvault.setAlwaysOnTop(next);
  }, []);

  // ── AI processing ──────────────────────────────────────────────────────────
  const handleAiAction = useCallback(async (action: string) => {
    setAiMenuOpen(false);
    const { editorContent: text, ollamaStatus: ollama, aiCtx: ctx, ollamaModel: model } = useStore.getState();
    if (!text.trim()) { addToast('No content to process', 'error'); return; }

    if (ollama?.running) {
      setAiOverlay({ mode: action, result: '' });
      const res = await window.ghostvault.ollamaFormat({ mode: action, text, ctx, model });
      if (res?.result) {
        setAiOverlay({ mode: action, result: res.result });
        return;
      }
    }

    const res = localAiProcess(action, text, ctx);
    if (res.error) { addToast(res.error, 'error'); return; }
    setAiOverlay({ mode: action, result: res.result || '' });
  }, [addToast]);

  const applyAiResult = useCallback(() => {
    if (!aiOverlay?.result) return;
    setEditorContent(aiOverlay.result);
    setDirty(true);
    setAiOverlay(null);
  }, [aiOverlay, setEditorContent, setDirty]);

  // ── Ollama refresh ─────────────────────────────────────────────────────────
  const refreshOllama = useCallback(async () => {
    const status = await window.ghostvault.getOllamaStatus();
    setOllamaStatus(status);
    setOllamaModels(status?.models || []);
  }, [setOllamaStatus]);

  // ── Insert template ────────────────────────────────────────────────────────
  const insertTemplate = useCallback((content: string) => {
    setEditorContent(content);
    setDirty(true);
    setActiveView('notes');
  }, [setEditorContent, setDirty, setActiveView]);

  // ── Setup wizard ───────────────────────────────────────────────────────────
  const handleSetupComplete = useCallback(async (path: string) => {
    await window.ghostvault.saveConfig({ vaultPath: path });
    setVaultPath(path);
    const { notes: n, folders: f } = await window.ghostvault.loadVault(path);
    setNotes(n);
    setFolders(f);
    setSetupDone(true);
  }, [setVaultPath, setNotes, setFolders]);

  if (!setupDone && !vaultPath) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Sidebar
        onOpenNote={openNote}
        onNewNote={() => setShowNewNote(true)}
        onNewFolder={() => setShowNewFolder(true)}
        onContextMenu={(x, y, path) => setContextMenu({ x, y, path })}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'notes' && (
          <EditorView
            onSave={saveNote}
            onAiMenu={() => setAiMenuOpen(true)}
            onTemplate={() => setActiveView('templates')}
            onTogglePin={handleTogglePin}
            onToggleAot={handleToggleAot}
            onCapture={() => setShowCapture(true)}
          />
        )}
        {activeView === 'capture' && (
          <CaptureView onSaved={refreshVault} />
        )}
        {activeView === 'vault' && <VaultView />}
        {activeView === 'templates' && (
          <TemplatesView onInsert={insertTemplate} />
        )}
        {activeView === 'settings' && (
          <SettingsView ollamaModels={ollamaModels} onOllamaRefresh={refreshOllama} />
        )}
      </div>

      <AnimatePresence>
        {showNewNote && (
          <NewNoteModal open={showNewNote} onClose={() => setShowNewNote(false)} onCreate={createNote} />
        )}
        {showNewFolder && (
          <NewFolderModal open={showNewFolder} onClose={() => setShowNewFolder(false)} onCreate={createFolder} />
        )}
        {showCapture && (
          <QuickCaptureModal open={showCapture} onClose={() => setShowCapture(false)} onSaved={refreshVault} />
        )}
        {aiMenuOpen && (
          <AiMenu open={aiMenuOpen} onClose={() => setAiMenuOpen(false)} onAction={handleAiAction} />
        )}
        {aiOverlay && (
          <AiOverlay
            mode={aiOverlay.mode}
            result={aiOverlay.result}
            onApply={applyAiResult}
            onClose={() => setAiOverlay(null)}
          />
        )}
        {contextMenu && (
          <NoteContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            path={contextMenu.path}
            onClose={() => setContextMenu(null)}
            onDelete={() => deleteNote(contextMenu.path)}
            onRename={(newName) => renameNote(contextMenu.path, newName)}
            onReveal={() => {
              window.ghostvault.revealInFinder(contextMenu.path);
              setContextMenu(null);
            }}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
