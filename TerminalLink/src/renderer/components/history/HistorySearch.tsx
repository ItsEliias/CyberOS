/**
 * HistorySearch — TerminalLink
 * Search input for the history panel with result count.
 */
import { useRef } from 'react';

interface Props {
  query: string;
  total: number;
  filtered: number;
  onChange: (q: string) => void;
}

export default function HistorySearch({ query, total, filtered, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{
          position: 'absolute',
          left: 7,
          fontSize: 11,
          color: 'var(--text-muted)',
          pointerEvents: 'none',
          lineHeight: 1,
        }}>
          ⌕
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search commands…"
          value={query}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '4px 24px 4px 22px',
            color: 'var(--text)',
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            title="Clear search"
            style={{
              position: 'absolute',
              right: 5,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>
      {query.trim() && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', paddingRight: 2 }}>
          {filtered} of {total} results
        </div>
      )}
    </div>
  );
}
