import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ScrapingSource } from '../../types/vaultcore';
import SourceListItem from './SourceListItem';

interface Props {
  sources: ScrapingSource[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

/** Renders source name with matched substring wrapped in an amber <mark> */
function HighlightedName({ name, query }: { name: string; query: string }) {
  if (!query) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark
        style={{
          background: 'rgba(210,153,34,0.3)',
          color: '#d29922',
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {name.slice(idx, idx + query.length)}
      </mark>
      {name.slice(idx + query.length)}
    </>
  );
}

export default function SourceList({ sources, selectedId, onSelect, onAdd }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? sources.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : sources;

  return (
    <div
      className="flex flex-col border-r h-full"
      style={{ width: 280, minWidth: 280, borderColor: 'var(--border)', background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-[11px] uppercase tracking-widest font-medium tabular-nums" style={{ color: 'var(--text-dim)' }}>
          Sources ({sources.length})
        </span>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter sources…"
          className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center gap-3">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.4 }}>
              <circle cx="22" cy="22" r="14" stroke="#8b949e" strokeWidth="1.5" fill="none"/>
              <line x1="22" y1="15" x2="22" y2="29" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="15" y1="22" x2="29" y2="22" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>No sources yet</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                Add a source to get started
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-dim)' }}>
            No matches for "{search}"
          </div>
        ) : (
          filtered.map((src, idx) => (
            <motion.div
              key={src.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <SourceListItem
                source={src}
                selected={src.id === selectedId}
                onClick={() => onSelect(src.id)}
                highlightQuery={search}
                HighlightedName={HighlightedName}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onAdd}
          className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 8px rgba(63,185,80,0.2)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(63,185,80,0.35)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(63,185,80,0.2)';
            (e.currentTarget as HTMLElement).style.transform = '';
          }}
        >
          + Add Source
        </button>
      </div>
    </div>
  );
}
