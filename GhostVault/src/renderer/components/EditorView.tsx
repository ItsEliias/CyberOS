import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { parseMarkdown } from '../lib/markdown';
import type { EditorMode } from '@shared/types';

interface Props {
  onSave     : () => void;
  onAiMenu   : () => void;
  onTemplate : () => void;
  onTogglePin: () => void;
  onToggleAot: () => void;
  onCapture  : () => void;
}

function modeLabel(m: EditorMode): string {
  return m === 'edit' ? 'Edit' : m === 'split' ? 'Split' : 'Preview';
}

export default function EditorView({
  onSave, onAiMenu, onTemplate, onTogglePin, onToggleAot, onCapture
}: Props) {
  const {
    activeNote, editorContent, editorMode, dirty, alwaysOnTop, pinnedPaths,
    setEditorContent, setEditorMode, setDirty
  } = useStore();

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = useStore(s => s.config);

  const isPinned = activeNote ? pinnedPaths.has(activeNote.path) : false;

  function markDirty() {
    setDirty(true);
    if (config?.autosave !== false) scheduleAutosave();
  }

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(onSave, 2000);
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditorContent(e.target.value);
    markDirty();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
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
      onSave();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 't') {
      e.preventDefault();
      const ts = `\`${new Date().toISOString().replace('T', ' ').slice(0, 16)}\``;
      const s  = ta.selectionStart;
      setEditorContent(ta.value.slice(0, s) + ts + ta.value.slice(ta.selectionEnd));
    }
  }

  const preview = useMemo(() => parseMarkdown(editorContent), [editorContent]);

  const modes: EditorMode[] = ['edit', 'split', 'preview'];

  const wordCount = useMemo(() => {
    const t = editorContent.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [editorContent]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>

        <div className="flex-1 min-w-0">
          {activeNote ? (
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{activeNote.folder}/</span>
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{activeNote.name}</span>
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
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex flex-1 min-h-0">
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
              <span>{wordCount} words</span>
              <span>{editorContent.length} chars</span>
              <span>{editorContent.split('\n').length} lines</span>
            </div>
          </div>
        )}

        {editorMode !== 'edit' && (
          <div className={`flex-1 overflow-y-auto p-6 ${editorMode === 'split' ? '' : ''}`}
            style={{ background: 'var(--bg)', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            <div className="markdown-preview max-w-prose mx-auto"
              dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        )}
      </div>
    </div>
  );
}
