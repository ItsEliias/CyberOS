/**
 * HistorySearch — TerminalLink
 * Search input for the history panel with result count and match rate indicator.
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 2 }}>
          <span style={{ fontSize: 9, color: 'rgba(0,255,65,0.3)' }}>
            {filtered === 0 ? 'no matches' : `${filtered} of ${total}`}
          </span>
          {filtered > 0 && total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Mini match-rate bar */}
              <div style={{ width: 40, height: 3, background: 'rgba(0,255,65,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((filtered / total) * 100)}%`,
                  background: filtered === total ? '#00ff41' : 'rgba(0,255,65,0.5)',
                  borderRadius: 2,
                  transition: 'width 0.2s ease',
                }} />
              </div>
              <span style={{ fontSize: 9, color: 'rgba(0,255,65,0.3)' }}>
                {Math.round((filtered / total) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
      {/* Export hint */}
      {filtered > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 8, color: 'rgba(0,255,65,0.25)',
            fontFamily: 'var(--font-mono)',
          }}>
            <kbd style={{
              fontSize: 8, padding: '1px 4px', borderRadius: 2,
              background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.12)',
              color: 'rgba(0,255,65,0.3)', fontFamily: 'var(--font-mono)',
            }}>⌘E</kbd>
            export
          </span>
        </div>
      )}
    </div>
  );
}
