/**
 * StatusBar — TerminalLink
 * Bottom status bar showing session name, cwd, exit code, and target context.
 */
import { useState, useEffect } from 'react';
import type { SessionContext } from '@shared/types';

interface Props {
  sessionCtx: SessionContext;
  commandCount: number;
  sessionName: string;
  cwd?: string;
  exitCode?: number | null;
  /** When true the animated handshake icon shows; after 1.8s it resolves to steady dot */
  connecting?: boolean;
}

function Sep() {
  return (
    <span style={{ color: 'rgba(0,255,65,0.2)', margin: '0 2px', fontFamily: 'var(--font-mono)' }}>│</span>
  );
}

/** Animated connection status indicator */
function ConnIndicator({ connecting }: { connecting: boolean }) {
  const [phase, setPhase] = useState<'shake' | 'ready'>(connecting ? 'shake' : 'ready');

  useEffect(() => {
    if (connecting) {
      setPhase('shake');
      const t = setTimeout(() => setPhase('ready'), 1800);
      return () => clearTimeout(t);
    }
    setPhase('ready');
  }, [connecting]);

  if (phase === 'shake') {
    return (
      <span
        className="conn-handshake"
        title="Connecting…"
        style={{ fontSize: 11, lineHeight: 1, display: 'inline-block', color: '#d29922' }}
      >
        ⇄
      </span>
    );
  }

  return (
    <span
      className="conn-dot-ready"
      title="Connected"
      style={{
        width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
        background: '#00ff41',
        boxShadow: '0 0 5px rgba(0,255,65,0.6)',
        flexShrink: 0,
      }}
    />
  );
}

export default function StatusBar({ sessionCtx, commandCount, sessionName, cwd, exitCode, connecting = false }: Props) {
  const hasTarget = Boolean(sessionCtx.activeTarget || sessionCtx.activeIP);

  return (
    <div style={{
      height: 22, display: 'flex', alignItems: 'center', padding: '0 10px',
      background: 'rgba(5,10,4,0.98)',
      borderTop: '1px solid rgba(0,255,65,0.1)',
      flexShrink: 0, gap: 8,
      fontSize: 10, fontFamily: 'var(--font-mono)',
      color: 'rgba(0,255,65,0.4)', userSelect: 'none',
    }}>
      {/* Session name with prompt prefix */}
      <span style={{ color: '#00ff41', fontWeight: 600, letterSpacing: '0.05em' }}>
        <span style={{ color: 'rgba(0,255,65,0.4)', marginRight: 4 }}>$</span>
        {sessionName}
      </span>

      {cwd && (
        <>
          <Sep />
          <span style={{
            color: '#7abf7a', maxWidth: 260,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cwd}
          </span>
        </>
      )}

      {exitCode !== null && exitCode !== undefined && (
        <>
          <Sep />
          <span style={{ color: exitCode === 0 ? '#00ff41' : '#f85149', fontWeight: 600 }}>
            [{exitCode}]
          </span>
        </>
      )}

      <Sep />
      <span style={{ color: 'rgba(0,255,65,0.4)' }}>
        {commandCount} cmd{commandCount !== 1 ? 's' : ''}
      </span>

      {hasTarget && (
        <>
          <Sep />
          <span style={{ color: '#7abf7a', letterSpacing: '0.03em' }}>
            {sessionCtx.activeTarget}
            {sessionCtx.activeIP && (
              <span style={{ color: 'rgba(0,255,65,0.4)', marginLeft: 4 }}>{sessionCtx.activeIP}</span>
            )}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Line/column counter (mock values) */}
      <span style={{ color: 'rgba(0,255,65,0.35)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.04em' }}>
        Ln 24 Col 7
      </span>
      <Sep />

      {/* Connection indicator */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, letterSpacing: '0.08em' }}>
        <ConnIndicator connecting={connecting} />
        <span style={{
          color: connecting ? '#d29922' : (hasTarget ? '#7abf7a' : 'rgba(0,255,65,0.25)'),
          textTransform: 'uppercase',
          transition: 'color 0.3s ease',
        }}>
          {connecting ? 'CONNECTING' : (hasTarget ? 'TARGET SET' : 'NO TARGET')}
        </span>
      </span>
    </div>
  );
}
