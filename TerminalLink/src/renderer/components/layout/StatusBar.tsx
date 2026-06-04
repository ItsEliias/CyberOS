/**
 * StatusBar — TerminalLink
 * Bottom status bar showing session name, cwd, exit code, and target context.
 */
import type { SessionContext } from '@shared/types';

interface Props {
  sessionCtx: SessionContext;
  commandCount: number;
  sessionName: string;
  cwd?: string;
  exitCode?: number | null;
}

function Sep() {
  return (
    <span style={{ color: 'rgba(0,255,65,0.2)', margin: '0 2px', fontFamily: 'var(--font-mono)' }}>│</span>
  );
}

export default function StatusBar({ sessionCtx, commandCount, sessionName, cwd, exitCode }: Props) {
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

      {/* Target indicator */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, letterSpacing: '0.08em' }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
          background: hasTarget ? '#00ff41' : 'rgba(0,255,65,0.2)',
          boxShadow: hasTarget ? '0 0 6px rgba(0,255,65,0.5)' : 'none',
        }} />
        <span style={{ color: hasTarget ? '#7abf7a' : 'rgba(0,255,65,0.25)', textTransform: 'uppercase' }}>
          {hasTarget ? 'TARGET SET' : 'NO TARGET'}
        </span>
      </span>
    </div>
  );
}
