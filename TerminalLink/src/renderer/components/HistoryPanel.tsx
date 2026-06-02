import { useState, useMemo, useRef, useCallback } from 'react';
import type { CommandEntry } from '@shared/types';
import ReplayView from './ReplayView';

interface Props {
  commands: CommandEntry[];
  onClear: () => void;
}

// ─── Highlight matched substring in amber ─────────────────────────────────
function HighlightedCommand({ command, query }: { command: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{command}</>;

  const idx = command.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{command}</>;

  return (
    <>
      {command.slice(0, idx)}
      <span style={{
        background: 'rgba(245,158,11,0.2)',
        color: 'var(--warning)',
        borderRadius: 2,
        padding: '0 2px',
        fontSize: 'inherit',
      }}>
        {command.slice(idx, idx + q.length)}
      </span>
      {command.slice(idx + q.length)}
    </>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HistoryPanel({ commands, onClear }: Props) {
  const [query,        setQuery]       = useState('');
  const [clearPending, setClearPend]   = useState(false);
  const [replayMode,   setReplayMode]  = useState(false);
  const panelRef    = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sorted = [...commands].reverse();
    if (!q) return sorted;
    return sorted.filter(c => c.command.toLowerCase().includes(q));
  }, [commands, query]);

  // Cmd+F / Ctrl+F focuses the search input when the panel is focused
  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      if (!replayMode) searchRef.current?.focus();
    }
  }, [replayMode]);

  function handleExport() {
    const text = commands.map(c =>
      `[${c.timestamp}] [pane ${c.pane}] ${c.command}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `terminallink-history-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    if (!clearPending) { setClearPend(true); return; }
    setClearPend(false);
    onClear();
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handlePanelKeyDown}
      style={{
        width: 280,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
        overflow: 'hidden',
        flexShrink: 0,
        outline: 'none',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {replayMode ? 'Replay' : 'History'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{commands.length} cmds</span>
            <button
              onClick={() => setReplayMode(r => !r)}
              disabled={commands.length === 0}
              title="Replay session commands"
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 3,
                background: replayMode ? 'var(--accent-dim)' : 'var(--bg)',
                border: `1px solid ${replayMode ? 'var(--accent)' : 'var(--border)'}`,
                color: replayMode ? 'var(--accent)' : 'var(--text-dim)',
                opacity: commands.length === 0 ? 0.4 : 1,
                cursor: commands.length === 0 ? 'default' : 'pointer',
              }}
            >
              {replayMode ? '■ List' : '▶ Replay'}
            </button>
          </div>
        </div>

        {/* Search input — only in list mode */}
        {!replayMode && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {/* Search icon */}
            <span style={{
              position: 'absolute',
              left: 7,
              fontSize: 11,
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              lineHeight: 1,
            }}>⌕</span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search commands…"
              value={query}
              onChange={e => setQuery(e.target.value)}
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
              }}
            />
            {/* Clear button */}
            {query && (
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
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
              >✕</button>
            )}
          </div>
        )}
        {/* Result count when filter active */}
        {!replayMode && query.trim() && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', paddingRight: 2 }}>
            {filtered.length} of {commands.length} commands
          </div>
        )}
      </div>

      {/* Body — switches between list view and replay view */}
      {replayMode ? (
        <ReplayView
          commands={commands}
          onExit={() => setReplayMode(false)}
        />
      ) : (
        <>
          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
                {query ? 'No matches' : 'No commands yet'}
              </div>
            )}
            {filtered.map(entry => (
              <div
                key={entry.id}
                style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      background: entry.pane === 1 ? 'rgba(74,158,255,0.2)' : 'rgba(0,255,65,0.15)',
                      color:      entry.pane === 1 ? 'var(--accent)' : 'var(--success)',
                      borderRadius: 2,
                      textTransform: 'uppercase',
                    }}>P{entry.pane}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>
                  <button
                    title="Copy"
                    onClick={() => navigator.clipboard.writeText(entry.command)}
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      padding: '1px 4px',
                      borderRadius: 2,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    copy
                  </button>
                </div>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text)',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                }}>
                  <HighlightedCommand command={entry.command} query={query} />
                </span>
                {entry.outputSnippet && (
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {entry.outputSnippet}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div style={{
            padding: '6px 10px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 6,
            flexShrink: 0,
          }}>
            <button
              onClick={handleExport}
              disabled={commands.length === 0}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 11,
                borderRadius: 3,
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                opacity: commands.length === 0 ? 0.4 : 1,
              }}
            >
              Export
            </button>
            <button
              onClick={handleClear}
              disabled={commands.length === 0}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 11,
                borderRadius: 3,
                background: clearPending ? 'rgba(255,68,68,0.2)' : 'var(--bg)',
                border: `1px solid ${clearPending ? 'var(--error)' : 'var(--border)'}`,
                color: clearPending ? 'var(--error)' : 'var(--text-dim)',
                opacity: commands.length === 0 ? 0.4 : 1,
              }}
            >
              {clearPending ? 'Confirm' : 'Clear'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
