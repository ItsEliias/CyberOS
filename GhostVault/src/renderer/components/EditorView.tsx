import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { parseMarkdown, setWikiLinkOpener } from '../lib/markdown';
import WikilinkAutocomplete from './WikilinkAutocomplete';
import InlineAICommands from './InlineAICommands';
import VersionHistoryPanel from './VersionHistoryPanel';
import PresentationMode from './PresentationMode';
import type { EditorMode, NoteFile } from '@shared/types';

interface Props {
  onSave     : () => void;
  onAiMenu   : () => void;
  onTemplate : () => void;
  onTogglePin: () => void;
  onToggleAot: () => void;
  onCapture  : () => void;
  onOpenNote?: (note: NoteFile) => void;
}

function modeLabel(m: EditorMode): string {
  return m === 'edit' ? 'Edit' : m === 'split' ? 'Split' : 'Preview';
}

const TABLE_TEMPLATE = '\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n|       |       |       |\n|       |       |       |\n|       |       |       |\n';

export default function EditorView({
  onSave, onAiMenu, onTemplate, onTogglePin, onToggleAot, onCapture, onOpenNote
}: Props) {
  const {
    activeNote, editorContent, editorMode, dirty, alwaysOnTop, pinnedPaths,
    setEditorContent, setEditorMode, setDirty, notes, showHistory, setShowHistory,
    presentMode, setPresentMode, config, lockedNotes,
  } = useStore();

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [exportToast, setExportToast] = useState(false);

  // Wikilink autocomplete state
  const [wikiAc, setWikiAc] = useState<{ query: string; pos: { top: number; left: number } } | null>(null);

  // Inline AI commands
  const [aiCmd, setAiCmd] = useState<{ pos: { top: number; left: number } } | null>(null);

  const isPinned = activeNote ? pinnedPaths.has(activeNote.path) : false;
  const isLocked = activeNote ? lockedNotes.has(activeNote.path) : false;

  // Debounced preview update (150ms)
  useEffect(() => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      setPreviewHtml(parseMarkdown(editorContent));
    }, 150);
    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current); };
  }, [editorContent]);

  // Set wiki link opener for preview pane
  useEffect(() => {
    if (onOpenNote) {
      setWikiLinkOpener((name: string) => {
        const note = notes.find(n => n.name === name);
        if (note) onOpenNote(note);
      });
    }
  }, [onOpenNote, notes]);

  // F5 toggles presentation mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F5') { e.preventDefault(); setPresentMode(!presentMode); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentMode, setPresentMode]);

  async function handleExportToReport() {
    if (!activeNote || !editorContent.trim()) return;
    const ok = await window.ghostvault.exportNotes({ sessionName: activeNote.name, notes: editorContent });
    if (ok) { setExportToast(true); setTimeout(() => setExportToast(false), 2500); }
  }

  function markDirty() {
    setDirty(true);
    if (config?.autosave !== false) scheduleAutosave();
  }

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(onSave, 2000);
  }

  function getCursorPixelPos(ta: HTMLTextAreaElement): { top: number; left: number } {
    const rect = ta.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left + 12 };
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setEditorContent(val);
    markDirty();

    const ta = e.target;
    const pos = ta.selectionStart;
    const before = val.slice(0, pos);
    const lastLine = before.split('\n').pop() || '';

    // Wikilink autocomplete: detect [[
    const wikiMatch = lastLine.match(/\[\[([^\]]*?)$/);
    if (wikiMatch) {
      setWikiAc({ query: wikiMatch[1], pos: getCursorPixelPos(ta) });
      setAiCmd(null);
      return;
    } else {
      setWikiAc(null);
    }

    // Inline AI commands: detect / at start of line
    if (lastLine === '/') {
      setAiCmd({ pos: getCursorPixelPos(ta) });
    } else {
      setAiCmd(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    if (e.key === 'Escape') { setWikiAc(null); setAiCmd(null); }

    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, end = ta.selectionEnd;
      const newVal = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      setEditorContent(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
    }

    if (e.key === 'Enter') {
      const before    = ta.value.slice(0, ta.selectionStart);
      const lastLine  = before.split('\n').pop() || '';
      const listMatch = lastLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        e.preventDefault();
        const indent    = listMatch[1];
        const bullet    = listMatch[2];
        const newBullet = /^\d+$/.test(bullet.replace('.', ''))
          ? `${parseInt(bullet) + 1}. ` : `${bullet} `;
        const ins = `\n${indent}${newBullet}`;
        const s   = ta.selectionStart;
        const newVal = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd);
        setEditorContent(newVal);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + ins.length; }, 0);
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (activeNote) window.ghostvault.noteVersionsSave(activeNote.path, editorContent);
      onSave();
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 't') {
      e.preventDefault();
      const ts = `\`${new Date().toISOString().replace('T', ' ').slice(0, 16)}\``;
      const s  = ta.selectionStart;
      setEditorContent(ta.value.slice(0, s) + ts + ta.value.slice(ta.selectionEnd));
    }
  }

  function insertWikiLink(name: string) {
    const ta = editorRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const afterBrackets = before.replace(/\[\[([^\]]*?)$/, '');
    const remaining = ta.value.slice(pos);
    const newVal = afterBrackets + `[[${name}]]` + remaining;
    setEditorContent(newVal);
    setWikiAc(null);
    const newPos = afterBrackets.length + name.length + 4;
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = newPos; ta.focus(); }, 0);
  }

  function handleAiCommand(cmd: string) {
    const ta = editorRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos).replace(/\/$/, '');
    const remaining = ta.value.slice(pos);
    // Replace the / with the command invocation marker
    setEditorContent(before + remaining);
    setAiCmd(null);
    onAiMenu();
  }

  function insertTable() {
    const ta = editorRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const newVal = ta.value.slice(0, s) + TABLE_TEMPLATE + ta.value.slice(s);
    setEditorContent(newVal);
    markDirty();
  }

  const wordCount = useMemo(() => {
    const t = editorContent.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [editorContent]);

  const modes: EditorMode[] = ['edit', 'split', 'preview'];
  const hasOllama = useStore.getState().ollamaStatus?.running || false;

  return (
    <div className="flex flex-col h-full" style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>

        <div className="flex-1 min-w-0">
          {activeNote ? (
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{activeNote.folder}/</span>
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{activeNote.name}</span>
              {isLocked && <span className="text-[10px]" style={{ color: '#d29922' }}>🔒</span>}
            </div>
          ) : (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>GhostVault</span>
          )}
        </div>

        {/* Mode pill */}
        <div className="flex rounded border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {modes.map(m => (
            <button key={m}
              onClick={() => { setEditorMode(m); window.ghostvault.saveConfig({ editorMode: m }); }}
              className="px-2 py-0.5 text-[10px] transition-colors"
              style={{
                background: editorMode === m ? 'var(--accent)' : 'var(--bg3)',
                color     : editorMode === m ? '#fff' : 'var(--text-dim)'
              }}>
              {modeLabel(m)}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button onClick={insertTable}
            title="Insert Table" className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-dim)' }}>⊞</button>
          <button onClick={onTemplate}
            title="Templates" className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-dim)' }}>🗂</button>
          <button onClick={onAiMenu}
            title="AI" className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-dim)' }}>✨</button>
          <button onClick={onCapture}
            title="Capture window" className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-dim)' }}>⚡</button>
          <button onClick={onTogglePin}
            title={isPinned ? 'Unpin' : 'Pin'}
            className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            style={{ color: isPinned ? 'var(--accent)' : 'var(--text-dim)' }}>📌</button>
          <button onClick={onToggleAot}
            title="Always on top"
            className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            style={{ color: alwaysOnTop ? 'var(--accent)' : 'var(--text-dim)' }}>⬆</button>
          {activeNote && (
            <button onClick={() => setShowHistory(!showHistory)}
              title="Version history"
              className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
              style={{ color: showHistory ? 'var(--accent)' : 'var(--text-dim)' }}>⏱</button>
          )}
          <button onClick={() => activeNote && setPresentMode(true)}
            title="Presentation mode (F5)"
            className="w-7 h-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
            disabled={!activeNote}
            style={{ color: 'var(--text-dim)', opacity: activeNote ? 1 : 0.3 }}>▶</button>
          <button onClick={onSave}
            disabled={!dirty}
            className="px-2.5 py-1 rounded text-[10px] font-medium transition-colors"
            style={{
              background: dirty ? 'var(--accent)' : 'var(--bg3)',
              color: dirty ? '#fff' : 'var(--text-dim)',
              border: '1px solid var(--border)'
            }}>
            {dirty ? 'Save' : 'Saved'}
          </button>
          {activeNote && editorContent.trim() && (
            <button onClick={handleExportToReport}
              title="Export notes to ReportForge"
              className="px-2.5 py-1 rounded text-[10px] font-medium transition-colors"
              style={{ border: '1px solid var(--accent-dim, rgba(88,166,255,0.3))', color: 'var(--accent)' }}>
              → Report
            </button>
          )}
        </div>
      </div>

      {exportToast && (
        <div className="absolute top-14 right-4 px-3 py-1.5 rounded text-[11px] font-medium z-50"
          style={{ background: 'var(--bg3)', border: '1px solid var(--success)', color: 'var(--success)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          Notes staged for ReportForge
        </div>
      )}

      {/* Editor + Preview */}
      <div className="flex flex-1 min-h-0 relative">
        {editorMode !== 'preview' && (
          <div className={`flex flex-col ${editorMode === 'split' ? 'w-1/2 border-r' : 'flex-1'}`}
            style={{ borderColor: 'var(--border)' }}>
            <textarea
              ref={editorRef}
              value={editorContent}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={activeNote ? '' : 'Select or create a note to start editing…'}
              className="flex-1 w-full p-4 text-sm font-mono resize-none outline-none"
              style={{
                background: 'var(--bg)',
                color     : 'var(--text)',
                lineHeight : '1.7',
                tabSize    : 2
              }}
            />
            {/* Status bar */}
            <div className="flex items-center gap-4 px-4 py-1.5 border-t text-[10px]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              <span>{wordCount} words · ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
              <span>{editorContent.length} chars</span>
              <span>{editorContent.split('\n').length} lines</span>
            </div>
          </div>
        )}

        {editorMode !== 'edit' && (
          <div
            className="flex-1 overflow-y-auto p-6"
            style={{ background: 'var(--bg)', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
            data-wiki-root
          >
            <div className="markdown-preview max-w-prose mx-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}

        {/* Version history slide-over */}
        <AnimatePresence>
          {showHistory && activeNote && (
            <VersionHistoryPanel
              notePath={activeNote.path}
              currentContent={editorContent}
              onRestore={(content) => { setEditorContent(content); setDirty(true); setShowHistory(false); }}
              onClose={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Wikilink autocomplete popup */}
      {wikiAc && (
        <WikilinkAutocomplete
          notes={notes}
          query={wikiAc.query}
          position={wikiAc.pos}
          onSelect={insertWikiLink}
          onClose={() => setWikiAc(null)}
        />
      )}

      {/* Inline AI command popup */}
      {aiCmd && (
        <InlineAICommands
          position={aiCmd.pos}
          hasApiKey={hasOllama}
          onSelect={handleAiCommand}
          onClose={() => setAiCmd(null)}
        />
      )}

      {/* Presentation mode overlay */}
      <AnimatePresence>
        {presentMode && activeNote && (
          <PresentationMode
            content={editorContent}
            noteName={activeNote.name}
            onClose={() => setPresentMode(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
