/**
 * HistoryPanel — TerminalLink
 * 300px slide-in panel (animation handled by App.tsx AnimatePresence wrapper).
 * Uses CommandEntryRow and HistorySearch subcomponents.
 * Virtualizes the list when there are >500 entries for performance.
 */
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { CommandEntry } from '@shared/types';
import CommandEntryRow from './history/CommandEntryRow';
import HistorySearch   from './history/HistorySearch';
import ReplayView      from './ReplayView';

// Virtual list constants — each row is ~60px when no output snippet, ~80px with one
const ESTIMATED_ROW_HEIGHT = 68;
const VIRTUAL_THRESHOLD    = 500;
const OVERSCAN             = 5;

interface Props {
  commands: CommandEntry[];
  onClear: () => void;
}

// ─── Simple virtual list ──────────────────────────────────────────────────────
function VirtualList({
  items,
  query,
}: {
  items: CommandEntry[];
  query: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalHeight = items.length * ESTIMATED_ROW_HEIGHT;
  const startIdx    = Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN);
  const endIdx      = Math.min(items.length, Math.ceil((scrollTop + height) / ESTIMATED_ROW_HEIGHT) + OVERSCAN);
  const visibleItems = items.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Rendered rows, offset to correct position */}
        <div style={{ position: 'absolute', top: startIdx * ESTIMATED_ROW_HEIGHT, left: 0, right: 0 }}>
          {visibleItems.map(entry => (
            <CommandEntryRow key={entry.id} entry={entry} query={query} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Non-virtual list (< 500 entries) ────────────────────────────────────────
function PlainList({
  items,
  query,
}: {
  items: CommandEntry[];
  query: string;
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
      {items.length === 0 && (
        <div style={{
          padding: 12,
          color: 'var(--text-muted)',
          fontSize: 11,
          textAlign: 'center',
        }}>
          {query ? 'No matches' : 'No commands yet'}
        </div>
      )}
      {items.map(entry => (
        <CommandEntryRow key={entry.id} entry={entry} query={query} />
      ))}
    </div>
  );
}

// ─── HistoryPanel ─────────────────────────────────────────────────────────────
export default function HistoryPanel({ commands, onClear }: Props) {
  const [query,        setQuery]      = useState('');
  const [clearPending, setClearPend]  = useState(false);
  const [replayMode,   setReplayMode] = useState(false);
  const panelRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Newest first, filtered by query
  const filtered = useMemo(() => {
    const q      = query.toLowerCase().trim();
    const sorted = [...commands].reverse();
    if (!q) return sorted;
    return sorted.filter(c => c.command.toLowerCase().includes(q));
  }, [commands, query]);

  // Cmd+F / Ctrl+F focuses search when panel is focused
  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      if (!replayMode) searchRef.current?.focus();
    }
  }, [replayMode]);

  async function handleExport() {
    const text = commands.map(c =>
      `[${c.timestamp}] [${c.pane}] ${c.command}${c.outputSnippet ? `\n  > ${c.outputSnippet}` : ''}`
    ).join('\n');

    // Try native save dialog first; fall back to browser download
    try {
      const result = await window.electronAPI.exportHistory(text);
      if (result && result.success) return;
    } catch { /* fall through */ }

    // Browser fallback
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

  const useVirtual = filtered.length > VIRTUAL_THRESHOLD;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handlePanelKeyDown}
      style={{
        width: 300,
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}>
          <span style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {replayMode ? 'Replay' : 'History'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {commands.length} cmd{commands.length !== 1 ? 's' : ''}
            </span>
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

        {/* Search (list mode only) */}
        {!replayMode && (
          <HistorySearch
            query={query}
            total={commands.length}
            filtered={filtered.length}
            onChange={setQuery}
          />
        )}
      </div>

      {/* Body */}
      {replayMode ? (
        <ReplayView
          commands={commands}
          onExit={() => setReplayMode(false)}
        />
      ) : (
        <>
          {/* Virtual or plain list */}
          {filtered.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 11,
            }}>
              {query ? 'No matches' : 'No commands yet'}
            </div>
          ) : useVirtual ? (
            <VirtualList items={filtered} query={query} />
          ) : (
            <PlainList items={filtered} query={query} />
          )}

          {/* Footer */}
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
                cursor: commands.length === 0 ? 'default' : 'pointer',
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
                cursor: commands.length === 0 ? 'default' : 'pointer',
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
