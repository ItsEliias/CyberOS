import type { NoteFile } from '@shared/types';

interface Props {
  selectedPaths: Set<string>;
  notes: NoteFile[];
  folders: string[];
  onDelete: () => void;
  onMove: (folder: string) => void;
  onExportZip: () => void;
  onClear: () => void;
}

export default function BulkActionBar({
  selectedPaths, notes, folders,
  onDelete, onMove, onExportZip, onClear
}: Props) {
  if (selectedPaths.size === 0) return null;

  const count = selectedPaths.size;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-t shrink-0"
      style={{ borderColor: 'var(--border)', background: 'rgba(123,184,255,0.06)' }}
    >
      <span className="text-[11px] font-semibold" style={{ color: '#7bb8ff' }}>
        {count} selected
      </span>

      <div className="flex items-center gap-2 flex-1">
        <select
          defaultValue=""
          onChange={e => { if (e.target.value) onMove(e.target.value); }}
          className="px-2 py-1 rounded text-[10px] outline-none"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <option value="" disabled>Move to…</option>
          {folders.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <button
          onClick={onExportZip}
          className="px-2 py-1 rounded text-[10px] border transition-colors hover:bg-white/10"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          Export ZIP
        </button>

        <button
          onClick={onDelete}
          className="px-2 py-1 rounded text-[10px] border transition-colors hover:bg-white/10"
          style={{ borderColor: 'rgba(248,81,73,0.3)', color: '#f85149' }}
        >
          Delete all
        </button>
      </div>

      <button onClick={onClear}
        className="text-[10px] hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-dim)' }}>
        Clear
      </button>
    </div>
  );
}
