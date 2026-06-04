import { motion } from 'framer-motion';
import type { ScrapingSource } from '../../types/vaultcore';
import SourceListItem from './SourceListItem';

interface Props {
  sources: ScrapingSource[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export default function SourceList({ sources, selectedId, onSelect, onAdd }: Props) {
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
        <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-dim)' }}>
          Sources ({sources.length})
        </span>
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
        ) : (
          sources.map((src, idx) => (
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
