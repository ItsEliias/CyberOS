// GhostVault — EditorView (redesigned: glass panel aesthetic, soft blue accent)

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { parseMarkdown, setWikiLinkOpener } from '../lib/markdown';
import WikilinkAutocomplete from './WikilinkAutocomplete';
import InlineAICommands from './InlineAICommands';
import VersionHistoryPanel from './VersionHistoryPanel';
import PresentationMode from './PresentationMode';
import EditorStatusBar from './notes/EditorStatusBar';
import { ToolBtn, ToolDivider, TABLE_TEMPLATE, formatRelTime, tagHue } from './notes/EditorToolbar';
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
            <div className="flex flex-col gap-0.5 min-w-0">
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
              {/* Note metadata row */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono tabular-nums" style={{ color: 'rgba(72,79,88,0.5)' }}>
                  modified {formatRelTime(activeNote.mtime)}
                </span>
                {(activeNote.tags?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1">
                    {activeNote.tags!.slice(0, 3).map(tag => (
                      <span key={tag}
                        className={`text-[9px] px-1.5 py-px rounded-full font-medium tag-colored tag-hue-${tagHue(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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

        {/* Action buttons — grouped with dividers */}
        <div className="flex items-center gap-0.5">
          {/* Formatting group: Bold / Italic / Code / Link */}
          <ToolBtn onClick={() => wrapSelection('**', '**')} title="Bold (⌘B)"><span style={{ fontWeight: 700, fontFamily: 'serif', fontSize: '0.85rem' }}>B</span></ToolBtn>
          <ToolBtn onClick={() => wrapSelection('_', '_')} title="Italic (⌘I)"><span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: '0.85rem' }}>I</span></ToolBtn>
          <ToolBtn onClick={() => wrapSelection('`', '`')} title="Inline Code"><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>&lt;/&gt;</span></ToolBtn>
          <ToolBtn onClick={() => insertLink()} title="Insert Link">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </ToolBtn>
          <ToolDivider />
          {/* Insert group */}
          <ToolBtn onClick={insertTable} title="Insert Table">⊞</ToolBtn>
          <ToolBtn onClick={onTemplate} title="Insert Template">🗂</ToolBtn>
          <ToolDivider />
          {/* AI + Capture group */}
          <ToolBtn onClick={onAiMenu} title="AI Assistant">✨</ToolBtn>
          <ToolBtn onClick={onCapture} title="Capture Window">⚡</ToolBtn>
          <ToolDivider />
          {/* Note state group */}
          <ToolBtn onClick={onTogglePin} title={isPinned ? 'Unpin Note' : 'Pin Note'} active={isPinned}>📌</ToolBtn>
          <ToolBtn onClick={onToggleAot} title="Toggle Always on Top" active={alwaysOnTop}>⬆</ToolBtn>
          {activeNote && (
            <ToolBtn
              onClick={() => setShowHistory(!showHistory)}
              title="Version History"
              active={showHistory}
            >
              ⏱
            </ToolBtn>
          )}
          <ToolDivider />
          {/* View group */}
          <ToolBtn
            onClick={() => activeNote && setPresentMode(true)}
            title="Presentation Mode (F5)"
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
        {!activeNote && (
          <motion.div
            key="editor-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8"
            style={{ pointerEvents: 'none' }}
          >
            <div style={{ opacity: 0.22 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: '#7bb8ff' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1.5" style={{ color: 'rgba(139,148,158,0.55)' }}>
                No note open
              </div>
              <div className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(72,79,88,0.7)', maxWidth: '24ch', margin: '0 auto 12px' }}>
                Select a note from the list or create one
              </div>
              {/* Keyboard hints */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(42,51,71,0.4)', color: 'rgba(123,184,255,0.6)', border: '1px solid rgba(123,184,255,0.2)' }}>⌘N</kbd>
                  <span className="text-[10px]" style={{ color: 'rgba(72,79,88,0.5)' }}>new note</span>
                </div>
                <span style={{ color: 'rgba(42,51,71,0.5)', fontSize: 10 }}>·</span>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(42,51,71,0.4)', color: 'rgba(139,148,158,0.5)', border: '1px solid rgba(42,51,71,0.5)' }}>⌘S</kbd>
                  <span className="text-[10px]" style={{ color: 'rgba(72,79,88,0.5)' }}>save</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {editorMode !== 'preview' && (
          <div
            className={`flex flex-col ${editorMode === 'split' ? 'w-1/2' : 'flex-1'} ${!activeNote ? 'hidden' : ''}`}
            style={{ borderRight: editorMode === 'split' ? '1px solid rgba(42,51,71,0.35)' : 'none' }}
          >
            <textarea
              ref={editorRef}
              value={editorContent}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder=""
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
            <EditorStatusBar
              wordCount={wordCount}
              charCount={editorContent.length}
              lineCount={editorContent.split('\n').length}
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
