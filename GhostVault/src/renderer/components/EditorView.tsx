// GhostVault — EditorView (redesigned: glass panel aesthetic, soft blue accent)

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { parseMarkdown, setWikiLinkOpener } from '../lib/markdown';
import WikilinkAutocomplete from './WikilinkAutocomplete';
import InlineAICommands from './InlineAICommands';
import VersionHistoryPanel from './VersionHistoryPanel';
import PresentationMode from './PresentationMode';
import EditorStatusBar from './notes/EditorStatusBar';
import LineNumberGutter from './notes/LineNumberGutter';
import EditorEmptyState from './notes/EditorEmptyState';
import EditorTopBar from './notes/EditorTopBar';
import { TABLE_TEMPLATE } from './notes/EditorToolbar';
import type { EditorMode, NoteFile } from '@shared/types';

interface Props {
  onSave          : () => void;
  onAiMenu        : () => void;
  onTemplate      : () => void;
  onTogglePin     : () => void;
  onToggleAot     : () => void;
  onCapture       : () => void;
  onOpenNote?     : (note: NoteFile) => void;
  onFocusModeChange?: (focused: boolean) => void;
}

export default function EditorView({
  onSave, onAiMenu, onTemplate, onTogglePin, onToggleAot, onCapture, onOpenNote, onFocusModeChange
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
  const [focusMode, setFocusMode] = useState(false);

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
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFocusMode(f => {
          const next = !f;
          onFocusModeChange?.(next);
          return next;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentMode, setPresentMode, onFocusModeChange]);

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

  function wrapSelection(before: string, after: string) {
    const ta = editorRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = ta.value.slice(s, e);
    const newVal = ta.value.slice(0, s) + before + selected + after + ta.value.slice(e);
    setEditorContent(newVal);
    markDirty();
    setTimeout(() => {
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + selected.length;
      ta.focus();
    }, 0);
  }

  function insertLink() {
    const ta = editorRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = ta.value.slice(s, e);
    const ins = `[${selected || 'link text'}](url)`;
    const newVal = ta.value.slice(0, s) + ins + ta.value.slice(e);
    setEditorContent(newVal);
    markDirty();
    setTimeout(() => {
      const urlStart = s + ins.length - 4;
      ta.selectionStart = urlStart;
      ta.selectionEnd = urlStart + 3;
      ta.focus();
    }, 0);
  }

  const wordCount = useMemo(() => {
    const t = editorContent.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [editorContent]);

  const WORD_GOAL = 500;
  const goalProgress = Math.min(wordCount / WORD_GOAL, 1);
  const goalReached  = wordCount >= WORD_GOAL;

  const hasOllama = useStore.getState().ollamaStatus?.running || false;

  function toggleFocusMode() {
    setFocusMode(f => { const next = !f; onFocusModeChange?.(next); return next; });
  }

  return (
    <div className={`flex flex-col h-full relative${focusMode ? ' focused' : ''}`} style={{ background: '#07080f' }}>
      <EditorTopBar
        activeNote={activeNote}
        editorContent={editorContent}
        editorMode={editorMode}
        dirty={dirty}
        isPinned={isPinned}
        isLocked={isLocked}
        alwaysOnTop={alwaysOnTop}
        showHistory={showHistory}
        focusMode={focusMode}
        onSave={onSave}
        onAiMenu={onAiMenu}
        onTemplate={onTemplate}
        onTogglePin={onTogglePin}
        onToggleAot={onToggleAot}
        onCapture={onCapture}
        onInsertLink={insertLink}
        onInsertTable={insertTable}
        onWrapSelection={wrapSelection}
        onSetMode={(m) => { setEditorMode(m); window.ghostvault.saveConfig({ editorMode: m }); }}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onToggleFocus={toggleFocusMode}
        onPresentMode={() => activeNote && setPresentMode(true)}
        onExportReport={handleExportToReport}
      />

      {/* Focus mode hint */}
      {focusMode && (
        <div
          key="focus-hint"
          className="focus-mode-hint absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[10px] font-medium z-50 pointer-events-none"
          style={{
            background: 'rgba(19,21,37,0.9)',
            border: '1px solid rgba(123,184,255,0.2)',
            color: 'rgba(123,184,255,0.7)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Focus mode · ⌘⇧F to exit
        </div>
      )}

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
        {!activeNote && <EditorEmptyState />}

        {editorMode !== 'preview' && (
          <div
            className={`flex flex-col ${editorMode === 'split' ? 'w-1/2' : 'flex-1'} ${!activeNote ? 'hidden' : ''}`}
            style={{ borderRight: editorMode === 'split' ? '1px solid rgba(42,51,71,0.35)' : 'none' }}
          >
            {/* Gutter + textarea row */}
            <div className="flex flex-1 min-h-0">
              <LineNumberGutter
                content={editorContent}
                textareaRef={editorRef}
                lineHeight={23}
                paddingTop={20}
              />
              <textarea
                ref={editorRef}
                value={editorContent}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="flex-1 p-5 resize-none outline-none overflow-y-auto"
                style={{
                  background: 'transparent',
                  color: '#c9d1d9',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  lineHeight: '23px',
                  tabSize: 2,
                  caretColor: '#7bb8ff',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(42,51,71,0.4) transparent',
                }}
              />
            </div>

            {/* Word goal bar */}
            {activeNote && (
              <div
                className="shrink-0"
                style={{ height: 3, background: 'rgba(42,51,71,0.3)' }}
                title={`${wordCount} / ${WORD_GOAL} words`}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${goalProgress * 100}%`,
                    background: goalReached ? '#3fb950' : '#e3a246',
                    transition: 'width 0.4s ease, background 0.4s ease',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              </div>
            )}

            <EditorStatusBar
              wordCount={wordCount}
              charCount={editorContent.length}
              lineCount={editorContent.split('\n').length}
              wordGoal={WORD_GOAL}
              goalReached={goalReached}
            />
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
