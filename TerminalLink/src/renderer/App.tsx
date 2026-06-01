import { useEffect, useRef, useState, useCallback } from 'react';
import TerminalPane from './components/TerminalPane';
import HistoryPanel from './components/HistoryPanel';
import type { CommandEntry, SessionContext } from '@shared/types';

// Stable pane IDs for the session
const PANE_IDS = {
  1: `pane1-${Date.now()}`,
  2: `pane2-${Date.now() + 1}`,
} as const;

export default function App() {
  const [splitMode,     setSplitMode]     = useState(false);
  const [activePane,    setActivePane]    = useState<1 | 2>(1);
  const [commandLog,    setCommandLog]    = useState<CommandEntry[]>([]);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [sessionCtx,    setSessionCtx]    = useState<SessionContext>({});
  const [version,       setVersion]       = useState('');
  const logQueueRef = useRef<CommandEntry[]>([]);
  const flushTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Boot
  useEffect(() => {
    (async () => {
      const [ctx, ver] = await Promise.all([
        window.electronAPI.getSessionContext(),
        window.electronAPI.getVersion(),
      ]);
      setSessionCtx(ctx);
      setVersion(ver);
    })();
  }, []);

  // Debounced log flush to main
  const flushLog = useCallback((entries: CommandEntry[]) => {
    if (entries.length === 0) return;
    window.electronAPI.logCommands(entries).catch(console.error);
  }, []);

  const handleCommand = useCallback((entry: CommandEntry) => {
    setCommandLog(prev => [...prev, entry]);
    logQueueRef.current.push(entry);
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      flushLog(logQueueRef.current);
      logQueueRef.current = [];
    }, 2000);
  }, [flushLog]);

  const handleClearLog = useCallback(() => {
    setCommandLog([]);
    logQueueRef.current = [];
  }, []);

  // Badge helpers
  const sessionBadge = [
    sessionCtx.activeLab    && `LAB: ${sessionCtx.activeLab}`,
    sessionCtx.activeTarget && `TARGET: ${sessionCtx.activeTarget}`,
    sessionCtx.activeIP     && sessionCtx.activeIP,
  ].filter(Boolean).join('  ·  ');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text)',
    }}>

      {/* ── Header ── */}
      <div style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 10,
        WebkitAppRegion: 'drag' as unknown as undefined,
        userSelect: 'none',
      }}>
        {/* macOS traffic lights spacer */}
        <div style={{ width: 60, flexShrink: 0 }} />

        {/* App name */}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>
          TerminalLink
        </span>

        {/* Session badge */}
        {sessionBadge && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '1px 6px',
            maxWidth: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {sessionBadge}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Command count */}
        {commandLog.length > 0 && (
          <span style={{
            fontSize: 10,
            color: 'var(--success)',
            background: 'rgba(0,255,65,0.1)',
            border: '1px solid rgba(0,255,65,0.3)',
            borderRadius: 3,
            padding: '1px 6px',
          }}>
            {commandLog.length} cmd{commandLog.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Split toggle */}
        <button
          onClick={() => setSplitMode(m => !m)}
          title={splitMode ? 'Single pane' : 'Split panes'}
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 3,
            background: splitMode ? 'var(--accent-dim)' : 'var(--bg)',
            border: `1px solid ${splitMode ? 'var(--accent)' : 'var(--border)'}`,
            color: splitMode ? 'var(--accent)' : 'var(--text-dim)',
            WebkitAppRegion: 'no-drag' as unknown as undefined,
          }}
        >
          {splitMode ? '⊟ Split' : '⊞ Split'}
        </button>

        {/* History toggle */}
        <button
          onClick={() => setHistoryOpen(h => !h)}
          title="Command history"
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 3,
            background: historyOpen ? 'var(--accent-dim)' : 'var(--bg)',
            border: `1px solid ${historyOpen ? 'var(--accent)' : 'var(--border)'}`,
            color: historyOpen ? 'var(--accent)' : 'var(--text-dim)',
            WebkitAppRegion: 'no-drag' as unknown as undefined,
          }}
        >
          History
        </button>

        {/* Version */}
        {version && (
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>v{version}</span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Terminal area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          gap: 4,
          padding: 6,
          overflow: 'hidden',
        }}>
          <TerminalPane
            paneId={PANE_IDS[1]}
            paneNumber={1}
            active={activePane === 1}
            onCommand={handleCommand}
            onFocus={() => setActivePane(1)}
          />
          {splitMode && (
            <TerminalPane
              paneId={PANE_IDS[2]}
              paneNumber={2}
              active={activePane === 2}
              onCommand={handleCommand}
              onFocus={() => setActivePane(2)}
            />
          )}
        </div>

        {/* History panel */}
        {historyOpen && (
          <HistoryPanel
            commands={commandLog}
            onClear={handleClearLog}
          />
        )}
      </div>
    </div>
  );
}
