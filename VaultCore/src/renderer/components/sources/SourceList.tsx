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
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>No sources yet</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
              Add a source to get started
            </div>
          </div>
        ) : (
          sources.map((src) => (
            <SourceListItem
              key={src.id}
              source={src}
              selected={src.id === selectedId}
              onClick={() => onSelect(src.id)}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={onAdd}
          className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + Add Source
        </button>
      </div>
    </div>
  );
}
