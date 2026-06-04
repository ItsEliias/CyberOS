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

export default function StatusBar({ sessionCtx, commandCount, sessionName, cwd, exitCode }: Props) {
  const hasTarget = Boolean(sessionCtx.activeTarget || sessionCtx.activeIP);

  return (
    <div style={{
      height: 22, display: 'flex', alignItems: 'center', padding: '0 10px',
      background: 'var(--panel)', borderTop: '1px solid var(--border)',
      flexShrink: 0, gap: 10, fontSize: 10, color: 'var(--text-muted)', userSelect: 'none',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <span style={{ color: 'var(--text-dim)' }}>
        {sessionName}
      </span>

      {cwd && (
        <>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--accent)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cwd}
          </span>
        </>
      )}

      {exitCode !== null && exitCode !== undefined && (
        <>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ color: exitCode === 0 ? 'var(--accent)' : '#ff4444' }}>
            Exit: {exitCode}
          </span>
        </>
      )}

      <span style={{ color: 'var(--border)' }}>·</span>
      <span>{commandCount} cmd{commandCount !== 1 ? 's' : ''}</span>

      {hasTarget && (
        <>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--text-dim)' }}>
            {sessionCtx.activeTarget}
            {sessionCtx.activeIP && <span style={{ color: 'var(--text-muted)' }}> {sessionCtx.activeIP}</span>}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: hasTarget ? 'var(--accent)' : 'var(--text-muted)',
          display: 'inline-block',
        }} />
        {hasTarget ? 'Target set' : 'No target'}
      </span>
    </div>
  );
}
