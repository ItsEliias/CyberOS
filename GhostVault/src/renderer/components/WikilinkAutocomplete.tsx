import { useEffect, useRef } from 'react';
import type { NoteFile } from '@shared/types';

interface Props {
  notes: NoteFile[];
  query: string;
  position: { top: number; left: number };
  onSelect: (noteName: string) => void;
  onClose: () => void;
}

export default function WikilinkAutocomplete({ notes, query, position, onSelect, onClose }: Props) {
  const filtered = notes
    .filter(n => n.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="fixed z-50 rounded-lg border shadow-xl py-1"
      style={{
        top: position.top,
        left: position.left,
        minWidth: 200,
        background: 'var(--bg3)',
        borderColor: 'var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div className="px-3 py-1 text-[9px] uppercase tracking-wider font-semibold"
        style={{ color: 'var(--text-dim)' }}>
        Link to note
      </div>
      {filtered.map(note => (
        <button
          key={note.path}
          onMouseDown={e => { e.preventDefault(); onSelect(note.name); }}
          className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <span style={{ color: 'var(--text)' }}>{note.name}</span>
          {note.folder !== '/' && (
            <span className="ml-2" style={{ color: 'var(--text-dim)' }}>{note.folder}/</span>
          )}
        </button>
      ))}
    </div>
  );
}
