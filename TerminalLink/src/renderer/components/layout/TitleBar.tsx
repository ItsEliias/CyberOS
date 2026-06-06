import type { SessionContext } from '@shared/types';
import HelpIcon from '../ui/HelpIcon';

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
  fontSize: 10, padding: '3px 10px', borderRadius: 6, height: 24,
  border: '1px solid rgba(42,51,71,0.6)',
  background: 'rgba(42,51,71,0.4)',
  color: '#e2e8f0', cursor: 'pointer',
  fontFamily: 'var(--font-mono)', lineHeight: '16px',
  WebkitAppRegion: 'no-drag' as unknown as undefined,
  transition: 'all 0.15s cubic-bezier(0.2,0.8,0.2,1)',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(0,255,65,0.14)',
  border: '1px solid rgba(0,255,65,0.55)',
  color: '#00ff41',
  textShadow: '0 0 8px rgba(0,255,65,0.6)',
  boxShadow: '0 0 10px rgba(0,255,65,0.18), inset 0 0 8px rgba(0,255,65,0.06)',
};

const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(248,81,73,0.12)',
  border: '1px solid rgba(248,81,73,0.5)',
  color: '#f85149',
  boxShadow: '0 0 8px rgba(248,81,73,0.15)',
};

export default function TitleBar({
  sessionCtx, commandCount, splitMode, historyOpen, activeView,
  broadcastMode = false, snippetsOpen = false,
  onToggleSplit, onToggleHistory, onSetView,
  onToggleBroadcast, onToggleSnippets, onOpenPalette, onOpenLauncher,
  version, onHelp,
}: Props) {
  const sessionBadge = [
    sessionCtx.activeLab    && `LAB:${sessionCtx.activeLab}`,
    sessionCtx.activeTarget && `TGT:${sessionCtx.activeTarget}`,
    sessionCtx.activeIP     && sessionCtx.activeIP,
  ].filter(Boolean).join('  //  ');

  return (
    <div style={{
      height: 34, display: 'flex', alignItems: 'center', padding: '0 12px',
      background: 'rgba(5,10,4,0.98)',
      borderBottom: '1px solid rgba(0,255,65,0.1)',
      flexShrink: 0, gap: 6,
      WebkitAppRegion: 'drag' as unknown as undefined,
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* Accent underline */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,65,0.2) 30%, rgba(0,255,65,0.2) 70%, transparent 100%)',
      }} />

      {/* Traffic light spacer */}
      <div style={{ width: 64, flexShrink: 0 }} />

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,65,0.5))' }}>
          <polyline points="1,4 4,1 4,4" stroke="#00ff41" strokeWidth="1.5" fill="none" />
          <line x1="4" y1="4" x2="12" y2="12" stroke="#00ff41" strokeWidth="1" />
          <rect x="8" y="8" width="4" height="4" stroke="#00ff41" strokeWidth="1" fill="none" />
        </svg>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
          color: '#00ff41',
          textShadow: '0 0 10px rgba(0,255,65,0.45)',
        }}>
          TerminalLink
        </span>
      </div>

      {sessionBadge && (
        <span style={{
          fontSize: 9, color: '#3d6b3d', fontFamily: 'var(--font-mono)',
          background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.1)',
          borderRadius: 2, padding: '1px 6px',
          maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '0.05em',
        }}>
          {sessionBadge}
        </span>
      )}

      {broadcastMode && (
        <span style={{
          fontSize: 9, letterSpacing: 1, color: '#f85149',
          background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.4)',
          borderRadius: 2, padding: '1px 6px',
          animation: 'bc-pulse 1s ease-in-out infinite', flexShrink: 0,
          fontFamily: 'var(--font-mono)', fontWeight: 700,
        }}>
          BROADCAST
        </span>
      )}

      <div style={{ flex: 1 }} />

      {commandCount > 0 && (
        <span style={{
          fontSize: 9, color: '#00ff41', fontFamily: 'var(--font-mono)',
          background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)',
          borderRadius: 2, padding: '1px 6px', flexShrink: 0,
        }}>
          {commandCount} cmd{commandCount !== 1 ? 's' : ''}
        </span>
      )}

      {activeView === 'terminal' && (
        <>
          <button onClick={onToggleSnippets} title="Snippet library" style={snippetsOpen ? btnActive : btnBase}>
            Snippets
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, WebkitAppRegion: 'no-drag' as unknown as undefined }}>
            <button onClick={onToggleSplit} title={splitMode ? 'Single pane' : 'Split panes'} style={splitMode ? btnActive : btnBase}>
              {splitMode ? 'Unsplit' : 'Split'}
            </button>
            <HelpIcon text="Split-pane mode runs two independent shells side by side. Toggle Broadcast to mirror keystrokes to every open pane at once." />
          </span>
          <button onClick={onToggleHistory} title="Command history" style={historyOpen ? btnActive : btnBase}>
            History
          </button>
          {onToggleBroadcast && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {broadcastMode && (
                <>
                  <span style={{
                    position: 'absolute', inset: -3, borderRadius: 10,
                    border: '2px solid rgba(248,81,73,0.7)',
                    animation: 'broadcast-ring 1.2s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    position: 'absolute', inset: -6, borderRadius: 13,
                    border: '1.5px solid rgba(248,81,73,0.3)',
                    animation: 'broadcast-ring 1.2s ease-in-out infinite 0.3s',
                    pointerEvents: 'none',
                  }} />
                </>
              )}
              <button onClick={onToggleBroadcast} title="Toggle broadcast mode" style={broadcastMode ? btnDanger : btnBase}>
                Broadcast
              </button>
            </div>
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
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 700,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'rgba(0,255,65,0.35)',
        background: 'rgba(0,255,65,0.04)', border: '1px solid rgba(0,255,65,0.08)',
        borderRadius: 999, padding: '2px 8px', flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        WebkitAppRegion: 'no-drag' as unknown as undefined,
      }}>
        CYBERTOOLS
      </span>

      {onHelp && (
        <button onClick={onHelp} title="Help" style={{ ...btnBase, fontWeight: 700, padding: '3px 7px' }}>?</button>
      )}

      {version && (
        <span style={{
          fontSize: 8, color: 'rgba(0,255,65,0.25)',
          fontFamily: 'var(--font-mono)', flexShrink: 0,
        }}>
          v{version}
        </span>
      )}

      <style>{`
        @keyframes bc-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes broadcast-ring { 0%{opacity:0.9;transform:scale(1)} 70%{opacity:0.2;transform:scale(1.15)} 100%{opacity:0;transform:scale(1.25)} }
      `}</style>
    </div>
  );
}
