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
      className="fixed z-50 wikilink-preview-popup"
      style={{
        top: position.top,
        left: position.left,
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      {/* Header bar */}
      <div className="px-3 pt-2 pb-1.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(42,51,71,0.4)' }}>
        <span className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: 'rgba(107,122,153,0.7)' }}>
          Link to note
        </span>
        <span className="text-[9px] font-mono"
          style={{ color: 'rgba(107,122,153,0.5)' }}>
          {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>
      <div className="py-1">
        {filtered.map(note => (
          <button
            key={note.path}
            onMouseDown={e => { e.preventDefault(); onSelect(note.name); }}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-baseline gap-2 group"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,184,255,0.07)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'rgba(123,184,255,0.5)', flexShrink: 0, marginTop: 1 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate" style={{ color: '#e6edf3' }}>{note.name}</span>
            {note.folder && note.folder !== '/' && note.folder !== '' && (
              <span className="ml-auto text-[9px] shrink-0" style={{ color: 'rgba(107,122,153,0.6)' }}>
                {note.folder}/
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
