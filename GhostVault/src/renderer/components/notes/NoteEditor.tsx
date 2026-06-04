// GhostVault — NoteEditor (spec path: components/notes/NoteEditor.tsx)
// Editable textarea panel for markdown note editing with debounced autosave
// Used within EditorView for the edit/split panel

import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';

interface Props {
  onSave:   () => void;
  onDirty?: () => void;
  className?: string;
}

export default function NoteEditor({ onSave, onDirty, className = '' }: Props) {
  const { editorContent, setEditorContent, setDirty, config } = useStore();
  const editorRef        = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus editor when content changes to a new note
  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (config?.autosave !== false) {
      autosaveTimerRef.current = setTimeout(onSave, 2000);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditorContent(e.target.value);
    setDirty(true);
    onDirty?.();
    scheduleAutosave();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;

    // Tab → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const s   = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      setEditorContent(val);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
      return;
    }

    // Enter → continue list
    if (e.key === 'Enter') {
      const before    = ta.value.slice(0, ta.selectionStart);
      const lastLine  = before.split('\n').pop() || '';
      const listMatch = lastLine.match(/^(\s*)([-*+]|\d+\.)\s/);
      if (listMatch) {
        e.preventDefault();
        const indent    = listMatch[1];
        const bullet    = listMatch[2];
        const newBullet = /^\d/.test(bullet)
          ? `${parseInt(bullet) + 1}. `
          : `${bullet} `;
        const ins = `\n${indent}${newBullet}`;
        const s   = ta.selectionStart;
        const val = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd);
        setEditorContent(val);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + ins.length; }, 0);
        return;
      }
    }

    // Cmd+S → save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      onSave();
      return;
    }

    // Cmd+T → insert timestamp
    if ((e.metaKey || e.ctrlKey) && e.key === 't') {
      e.preventDefault();
      const ts  = `\`${new Date().toISOString().replace('T', ' ').slice(0, 16)}\``;
      const s   = ta.selectionStart;
      setEditorContent(ta.value.slice(0, s) + ts + ta.value.slice(ta.selectionEnd));
    }
  }

  return (
    <textarea
      ref={editorRef}
      value={editorContent}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      placeholder="Start typing… (⌘S to save · ⌘T for timestamp)"
      spellCheck
      className={`w-full h-full p-4 text-sm font-mono resize-none outline-none editor-textarea ${className}`}
      style={{
        background: 'var(--bg)',
        color:      'var(--text)',
        lineHeight: '1.7',
        tabSize:    2,
        caretColor: 'var(--accent)',
      }}
    />
  );
}
