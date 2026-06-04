/**
 * ContextBar — TerminalLink
 * Always-visible bar showing $TARGET, $TARGET_IP, and linked session context.
 * Slides down from title bar on mount (Framer Motion).
 */
import { motion } from 'framer-motion';
import type { SessionContext } from '@shared/types';

interface Props {
  sessionCtx: SessionContext;
  sessionName: string;
}

interface DotProps {
  active: boolean;
  label: string;
  value?: string;
}

function ContextDot({ active, label, value }: DotProps) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        className={active ? 'status-dot-pulse' : undefined}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: active ? 'var(--accent)' : '#4a5568',
          flexShrink: 0,
          boxShadow: active ? '0 0 6px rgba(0,255,65,0.6)' : 'none',
          transition: 'all 0.3s ease',
          '--pulse-color': 'rgba(0,255,65,0.4)',
          '--pulse-color-fade': 'rgba(0,255,65,0)',
        } as React.CSSProperties}
      />
      <span style={{ color: '#4a5568', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{label}:</span>
      <span style={{
        fontSize: 10,
        color: active ? '#e2e8f0' : '#4a5568',
        fontFamily: 'var(--font-mono)',
      }}>
        {active ? value : 'not set'}
      </span>
    </span>
  );
}

export default function ContextBar({ sessionCtx, sessionName }: Props) {
  const hasAny = Boolean(sessionCtx.activeTarget || sessionCtx.activeIP || sessionCtx.activeLab);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 28, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        overflow: 'hidden',
        borderBottom: '1px solid rgba(42,51,71,0.4)',
        flexShrink: 0,
        background: 'rgba(10,10,15,0.6)',
      }}
    >
      <div style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 16,
        userSelect: 'none',
      }}>
        {hasAny ? (
          <>
            <ContextDot
              active={Boolean(sessionCtx.activeTarget)}
              label="$TARGET"
              value={sessionCtx.activeTarget}
            />
            <span style={{ color: '#4a5568', fontSize: 10 }}>·</span>
            <ContextDot
              active={Boolean(sessionCtx.activeIP)}
              label="$TARGET_IP"
              value={sessionCtx.activeIP}
            />
            {sessionCtx.activeLab && (
              <>
                <span style={{ color: '#4a5568', fontSize: 10 }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#4a5568', fontSize: 10, fontFamily: 'var(--font-mono)' }}>Session:</span>
                  <span style={{ fontSize: 10, color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                    {sessionCtx.activeLab}
                  </span>
                </span>
              </>
            )}
          </>
        ) : (
          <span style={{ fontSize: 10, color: '#4a5568', fontFamily: 'var(--font-mono)' }}>
            No active target — $TARGET not set
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#4a5568', fontFamily: 'var(--font-mono)' }}>{sessionName}</span>
      </div>
    </motion.div>
  );
}
