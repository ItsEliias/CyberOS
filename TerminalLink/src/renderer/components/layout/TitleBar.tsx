import type { SessionContext } from '@shared/types';

interface Props {
  sessionCtx: SessionContext;
  commandCount: number;
  splitMode: boolean;
  historyOpen: boolean;
  activeView: 'terminal' | 'sessions' | 'settings';
  broadcastMode?: boolean;
  snippetsOpen?: boolean;
  onToggleSplit: () => void;
  onToggleHistory: () => void;
  onSetView: (v: 'terminal' | 'sessions' | 'settings') => void;
  onToggleBroadcast?: () => void;
  onToggleSnippets?: () => void;
  onOpenPalette?: () => void;
  onOpenLauncher?: () => void;
  version?: string;
  onHelp?: () => void;
}

const btnBase: React.CSSProperties = {
  fontSize: 10, padding: '3px 8px', borderRadius: 3,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: '16px',
  WebkitAppRegion: 'no-drag' as unknown as undefined,
};

const btnActive: React.CSSProperties = {
  ...btnBase, background: 'var(--accent-dim)',
  border: '1px solid var(--accent)', color: 'var(--accent)',
};

const btnDanger: React.CSSProperties = {
  ...btnBase, background: 'rgba(255,68,68,0.12)',
  border: '1px solid rgba(255,68,68,0.5)', color: '#ff4444',
};

export default function TitleBar({
  sessionCtx, commandCount, splitMode, historyOpen, activeView,
  broadcastMode = false, snippetsOpen = false,
  onToggleSplit, onToggleHistory, onSetView,
  onToggleBroadcast, onToggleSnippets, onOpenPalette, onOpenLauncher,
  version, onHelp,
}: Props) {
  const sessionBadge = [
    sessionCtx.activeLab    && `LAB: ${sessionCtx.activeLab}`,
    sessionCtx.activeTarget && `TARGET: ${sessionCtx.activeTarget}`,
    sessionCtx.activeIP     && sessionCtx.activeIP,
  ].filter(Boolean).join('  ·  ');

  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', padding: '0 12px',
      background: 'var(--panel)', borderBottom: '1px solid var(--border)',
      flexShrink: 0, gap: 6,
      WebkitAppRegion: 'drag' as unknown as undefined, userSelect: 'none',
    }}>
      <div style={{ width: 60, flexShrink: 0 }} />

      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)', flexShrink: 0 }}>
        TerminalLink
      </span>

      {sessionBadge && (
        <span style={{
          fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 3, padding: '1px 6px',
          maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sessionBadge}
        </span>
      )}

      {broadcastMode && (
        <span style={{
          fontSize: 9, letterSpacing: 1, color: '#ff4444',
          background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.4)',
          borderRadius: 3, padding: '1px 6px', animation: 'bc-pulse 1s ease-in-out infinite',
          flexShrink: 0,
        }}>
          BROADCAST
        </span>
      )}

      <div style={{ flex: 1 }} />

      {commandCount > 0 && (
        <span style={{
          fontSize: 10, color: 'var(--accent)', background: 'rgba(0,255,65,0.1)',
          border: '1px solid rgba(0,255,65,0.3)', borderRadius: 3, padding: '1px 6px', flexShrink: 0,
        }}>
          {commandCount} cmd{commandCount !== 1 ? 's' : ''}
        </span>
      )}

      {activeView === 'terminal' && (
        <>
          <button onClick={onToggleSnippets} title="Snippet library" style={snippetsOpen ? btnActive : btnBase}>
            Snippets
          </button>
          <button onClick={onToggleSplit} title={splitMode ? 'Single pane' : 'Split panes'} style={splitMode ? btnActive : btnBase}>
            {splitMode ? 'Unsplit' : 'Split'}
          </button>
          <button onClick={onToggleHistory} title="Command history" style={historyOpen ? btnActive : btnBase}>
            History
          </button>
          {onToggleBroadcast && (
            <button onClick={onToggleBroadcast} title="Toggle broadcast mode" style={broadcastMode ? btnDanger : btnBase}>
              Broadcast
            </button>
          )}
          {onOpenLauncher && (
            <button onClick={onOpenLauncher} title="Tool launcher (Cmd+L)" style={btnBase}>
              Tools
            </button>
          )}
        </>
      )}

      {onOpenPalette && (
        <button onClick={onOpenPalette} title="Command palette (Cmd+Shift+P)" style={btnBase}>
          Palette
        </button>
      )}

      <button onClick={() => onSetView('sessions')} title="Sessions" style={activeView === 'sessions' ? btnActive : btnBase}>
        Sessions
      </button>
      <button onClick={() => onSetView('settings')} title="Settings" style={activeView === 'settings' ? btnActive : btnBase}>
        Settings
      </button>
      {activeView !== 'terminal' && (
        <button onClick={() => onSetView('terminal')} title="Back to terminal" style={btnBase}>
          Terminal
        </button>
      )}

      <span style={{
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a5568',
        background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.12)',
        borderRadius: 999, padding: '2px 8px', flexShrink: 0,
        WebkitAppRegion: 'no-drag' as unknown as undefined,
      }}>
        CYBERTOOLS
      </span>

      {onHelp && (
        <button onClick={onHelp} title="Help" style={{ ...btnBase, fontWeight: 700, padding: '3px 7px' }}>?</button>
      )}

      {version && <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>v{version}</span>}

      <style>{`
        @keyframes bc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
