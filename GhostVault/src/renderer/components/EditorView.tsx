// GhostVault — EditorView (redesigned: glass panel aesthetic, soft blue accent)

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

// Small toolbar icon button
function ToolBtn({ onClick, title, active, children, disabled }: {
  onClick?: () => void; title: string; active?: boolean;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="w-7 h-7 rounded flex items-center justify-center text-sm transition-colors"
      style={{
        color: active ? '#7bb8ff' : 'rgba(72,79,88,0.75)',
        background: active ? 'rgba(123,184,255,0.1)' : 'transparent',
        border: active ? '1px solid rgba(123,184,255,0.2)' : '1px solid transparent',
        opacity: disabled ? 0.3 : 1,
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

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

  const [wikiAc, setWikiAc] = useState<{ query: string; pos: { top: number; left: number } } | null>(null);
  const [aiCmd, setAiCmd] = useState<{ pos: { top: number; left: number } } | null>(null);

  const isPinned = activeNote ? pinnedPaths.has(activeNote.path) : false;
  const isLocked = activeNote ? lockedNotes.has(activeNote.path) : false;

  useEffect(() => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => {
      setPreviewHtml(parseMarkdown(editorContent));
    }, 150);
    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current); };
  }, [editorContent]);

  useEffect(() => {
    if (onOpenNote) {
      setWikiLinkOpener((name: string) => {
        const note = notes.find(n => n.name === name);
        if (note) onOpenNote(note);
      });
    }
  }, [onOpenNote, notes]);

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

    const wikiMatch = lastLine.match(/\[\[([^\]]*?)$/);
    if (wikiMatch) {
      setWikiAc({ query: wikiMatch[1], pos: getCursorPixelPos(ta) });
      setAiCmd(null);
      return;
    } else {
      setWikiAc(null);
    }

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
    <div className="flex flex-col h-full relative" style={{ background: '#07080f' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(42,51,71,0.4)',
          background: 'rgba(10,11,20,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Note title */}
        <div className="flex-1 min-w-0">
          {activeNote ? (
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-mono" style={{ color: 'rgba(72,79,88,0.7)' }}>
                {activeNote.folder}/
              </span>
              <span
                className="text-sm font-semibold truncate"
                style={{ color: '#e6edf3', fontFamily: 'var(--font-display)' }}
              >
                {activeNote.name}
              </span>
              {isLocked && (
                <span className="text-[10px]" style={{ color: '#d29922' }}>locked</span>
              )}
            </div>
          ) : (
            <span
              className="text-sm font-semibold"
              style={{ color: 'rgba(72,79,88,0.7)', fontFamily: 'var(--font-display)' }}
            >
              GhostVault
            </span>
          )}
        </div>

        {/* Mode pills */}
        <div
          className="flex rounded overflow-hidden"
          style={{ border: '1px solid rgba(42,51,71,0.5)' }}
        >
          {modes.map(m => (
            <button
              key={m}
              onClick={() => { setEditorMode(m); window.ghostvault.saveConfig({ editorMode: m }); }}
              className="px-2.5 py-1 text-[10px] font-medium transition-colors"
              style={{
                background: editorMode === m ? 'rgba(123,184,255,0.12)' : 'transparent',
                color: editorMode === m ? '#7bb8ff' : 'rgba(72,79,88,0.7)',
                borderRight: m !== 'preview' ? '1px solid rgba(42,51,71,0.4)' : 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              {modeLabel(m)}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <ToolBtn onClick={insertTable} title="Insert Table">⊞</ToolBtn>
          <ToolBtn onClick={onTemplate} title="Templates">🗂</ToolBtn>
          <ToolBtn onClick={onAiMenu} title="AI Assistant">✨</ToolBtn>
          <ToolBtn onClick={onCapture} title="Capture window">⚡</ToolBtn>
          <ToolBtn onClick={onTogglePin} title={isPinned ? 'Unpin' : 'Pin'} active={isPinned}>📌</ToolBtn>
          <ToolBtn onClick={onToggleAot} title="Always on top" active={alwaysOnTop}>⬆</ToolBtn>
          {activeNote && (
            <ToolBtn
              onClick={() => setShowHistory(!showHistory)}
              title="Version history"
              active={showHistory}
            >
              ⏱
            </ToolBtn>
          )}
          <ToolBtn
            onClick={() => activeNote && setPresentMode(true)}
            title="Presentation mode (F5)"
            disabled={!activeNote}
          >
            ▶
          </ToolBtn>

          <button
            onClick={onSave}
            disabled={!dirty}
            className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all ml-1"
            style={{
              background: dirty ? 'rgba(123,184,255,0.15)' : 'rgba(42,51,71,0.15)',
              color: dirty ? '#7bb8ff' : 'rgba(72,79,88,0.6)',
              border: dirty ? '1px solid rgba(123,184,255,0.3)' : '1px solid rgba(42,51,71,0.3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {dirty ? 'Save' : 'Saved'}
          </button>

          {activeNote && editorContent.trim() && (
            <button
              onClick={handleExportToReport}
              title="Export to ReportForge"
              className="px-2.5 py-1 rounded text-[10px] font-medium transition-colors ml-0.5"
              style={{
                border: '1px solid rgba(123,184,255,0.2)',
                color: '#7bb8ff',
                background: 'transparent',
                fontFamily: 'var(--font-display)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              → Report
            </button>
          )}
        </div>
      </div>

      {/* Export toast */}
      {exportToast && (
        <div
          className="absolute top-14 right-4 px-3 py-1.5 rounded text-[11px] font-medium z-50"
          style={{
            background: 'rgba(19,21,37,0.95)',
            border: '1px solid rgba(63,185,80,0.4)',
            color: '#3fb950',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Notes staged for ReportForge
        </div>
      )}

      {/* Editor + Preview panes */}
      <div className="flex flex-1 min-h-0 relative">
        {editorMode !== 'preview' && (
          <div
            className={`flex flex-col ${editorMode === 'split' ? 'w-1/2' : 'flex-1'}`}
            style={{ borderRight: editorMode === 'split' ? '1px solid rgba(42,51,71,0.35)' : 'none' }}
          >
            <textarea
              ref={editorRef}
              value={editorContent}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={activeNote ? '' : 'Select or create a note to start editing...'}
              className="flex-1 w-full p-5 resize-none outline-none"
              style={{
                background: 'transparent',
                color: '#c9d1d9',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                lineHeight: 1.8,
                tabSize: 2,
                caretColor: '#7bb8ff',
              }}
            />
            {/* Mini status bar */}
            <div
              className="flex items-center gap-4 px-4 py-1 text-[10px] font-mono"
              style={{
                borderTop: '1px solid rgba(42,51,71,0.3)',
                color: 'rgba(72,79,88,0.6)',
                background: 'rgba(7,8,15,0.5)',
              }}
            >
              <span className="tabular-nums">{wordCount} words</span>
              <span className="tabular-nums">{editorContent.length} chars</span>
              <span className="tabular-nums">{editorContent.split('\n').length} lines</span>
            </div>
          </div>
        )}

        {editorMode !== 'edit' && (
          <div
            className="flex-1 overflow-y-auto p-6"
            style={{
              background: 'transparent',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(42,51,71,0.4) transparent',
            }}
            data-wiki-root
          >
            <div
              className="markdown-preview max-w-prose mx-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
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
