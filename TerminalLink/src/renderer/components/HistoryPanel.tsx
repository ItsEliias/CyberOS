/**
 * HistoryPanel — TerminalLink
 * 300px slide-in panel (animation handled by App.tsx AnimatePresence wrapper).
 * Uses CommandEntryRow and HistorySearch subcomponents.
 * Virtualizes the list when there are >500 entries for performance.
 */
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { CommandEntry } from '@shared/types';
import CommandEntryRow from './history/CommandEntryRow';
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
function VirtualList({ items, query }: { items: CommandEntry[]; query: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalHeight  = items.length * ESTIMATED_ROW_HEIGHT;
  const startIdx     = Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN);
  const endIdx       = Math.min(items.length, Math.ceil((scrollTop + height) / ESTIMATED_ROW_HEIGHT) + OVERSCAN);
  const visibleItems = items.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
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
function PlainList({ items, query }: { items: CommandEntry[]; query: string }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
      {items.length === 0 && (
        <div style={{
          padding: 12,
          color: '#4a5568',
          fontSize: 10,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
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

  const filtered = useMemo(() => {
    const q      = query.toLowerCase().trim();
    const sorted = [...commands].reverse();
    if (!q) return sorted;
    return sorted.filter(c => c.command.toLowerCase().includes(q));
  }, [commands, query]);

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

    try {
      const result = await window.electronAPI.exportHistory(text);
      if (result && result.success) return;
    } catch { /* fall through */ }

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
        width: 300, display: 'flex', flexDirection: 'column',
        background: 'rgba(22,27,39,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderLeft: '1px solid rgba(42,51,71,0.6)',
        overflow: 'hidden', flexShrink: 0, outline: 'none',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px 8px',
        borderBottom: '1px solid rgba(42,51,71,0.6)',
        display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
        background: 'rgba(10,10,15,0.6)',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#e2e8f0',
          }}>
            {replayMode ? 'Replay' : 'Command History'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {commands.length > 0 && (
              <span style={{ fontSize: 10, color: '#4a5568' }}>
                {commands.length} cmd{commands.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => setReplayMode(r => !r)}
              disabled={commands.length === 0}
              title="Replay session commands"
              style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: replayMode ? 'rgba(0,255,65,0.12)' : 'rgba(42,51,71,0.4)',
                border: `1px solid ${replayMode ? 'rgba(42,51,71,0.6)' : 'rgba(42,51,71,0.6)'}`,
                color: replayMode ? '#00ff41' : '#e2e8f0',
                opacity: commands.length === 0 ? 0.4 : 1,
                cursor: commands.length === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {replayMode ? '■ List' : '▶ Replay'}
            </button>
          </div>
        </div>

        {/* Search */}
        {!replayMode && (
          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search commands…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(10,10,15,0.8)',
                border: '1px solid rgba(42,51,71,0.6)',
                borderRadius: 6,
                padding: '5px 28px 5px 10px',
                color: '#e2e8f0',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-mono)',
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#4a5568', fontSize: 12,
                  cursor: 'pointer', padding: '0 2px', lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>
        )}
        {query.trim() && (
          <span style={{ fontSize: 10, color: '#4a5568' }}>
            {filtered.length === 0 ? 'No matches' : `${filtered.length} of ${commands.length}`}
          </span>
        )}
      </div>

      {/* Body */}
      {replayMode ? (
        <ReplayView commands={commands} onExit={() => setReplayMode(false)} />
      ) : (
        <>
          {filtered.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4a5568', fontSize: 10,
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
            padding: '8px 12px',
            borderTop: '1px solid rgba(42,51,71,0.6)',
            display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0,
          }}>
            {/* Export as .txt — full width secondary button */}
            <button
              onClick={handleExport}
              disabled={commands.length === 0}
              style={{
                width: '100%', padding: '6px 0', fontSize: 12, borderRadius: 6,
                background: 'rgba(42,51,71,0.4)',
                border: '1px solid rgba(42,51,71,0.6)',
                color: commands.length === 0 ? '#4a5568' : '#e2e8f0',
                opacity: commands.length === 0 ? 0.5 : 1,
                cursor: commands.length === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)',
                height: 34,
              }}
            >
              Export as .txt
            </button>
            <button
              onClick={handleClear}
              disabled={commands.length === 0}
              style={{
                width: '100%', padding: '6px 0', fontSize: 12, borderRadius: 6,
                background: clearPending ? 'rgba(248,81,73,0.15)' : 'rgba(42,51,71,0.2)',
                border: `1px solid ${clearPending ? 'rgba(248,81,73,0.4)' : 'rgba(42,51,71,0.4)'}`,
                color: clearPending ? '#f85149' : '#8b949e',
                opacity: commands.length === 0 ? 0.4 : 1,
                cursor: commands.length === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)',
                height: 34,
              }}
            >
              {clearPending ? 'Confirm clear?' : 'Clear'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
