/**
 * ReplayView — session replay for TerminalLink
 * ItsEliias / CyberOS ecosystem
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { CommandEntry } from '@shared/types';

interface Props {
  commands: CommandEntry[];
  onExit: () => void;
}

type Speed = 1 | 2 | 5;

const BTN: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  borderRadius: 3,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text-dim)',
  cursor: 'pointer',
  flexShrink: 0,
};

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN,
  border: '1px solid var(--accent)',
  background: 'var(--accent-dim)',
  color: 'var(--accent)',
};

export default function ReplayView({ commands, onExit }: Props) {
  const [index,       setIndex]      = useState(0);
  const [autoPlay,    setAutoPlay]   = useState(false);
  const [speed,       setSpeed]      = useState<Speed>(2);
  const [copied,      setCopied]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total   = commands.length;
  const current = commands[index] ?? null;
  const pct     = total > 1 ? Math.round((index / (total - 1)) * 100) : 100;

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'n') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        e.preventDefault();
        step(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setAutoPlay(a => !a);
      } else if (e.key === 'Escape') {
        onExit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, onExit]);

  // step helper — defined as plain function so useEffect above can call it
  function step(dir: 1 | -1) {
    setIndex(i => {
      const next = i + dir;
      if (next < 0 || next >= total) return i;
      return next;
    });
  }

  // Auto-play ticker
  const tick = useCallback(() => {
    setIndex(i => {
      if (i >= total - 1) {
        setAutoPlay(false);
        return i;
      }
      return i + 1;
    });
  }, [total]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlay) {
      timerRef.current = setInterval(tick, speed * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, speed, tick]);

  // Stop auto-play if we reached the end
  useEffect(() => {
    if (index >= total - 1 && autoPlay) {
      setAutoPlay(false);
    }
  }, [index, total, autoPlay]);

  async function handleCopy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard rejected — leave indicator off */ }
  }

  if (total === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        No commands to replay
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'var(--accent)',
          transition: 'width 0.25s ease',
        }} />
      </div>

      {/* Step counter + auto-play indicator */}
      <div style={{
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {autoPlay && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
              animation: 'tl-pulse 1s ease-in-out infinite',
            }} />
          )}
          <span style={{ fontSize: 11, color: autoPlay ? 'var(--success)' : 'var(--text-dim)' }}>
            Step {index + 1} of {total}
          </span>
        </div>
        <button onClick={onExit} style={{ ...BTN, color: 'var(--text-muted)', fontSize: 10 }}>
          ✕ Exit Replay
        </button>
      </div>

      {/* Current command */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
        {current && (
          <>
            {/* Pane + timestamp row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  background: current.pane === 'left' ? 'rgba(0,255,65,0.15)' : 'rgba(74,158,255,0.2)',
                  color:      current.pane === 'left' ? 'var(--accent)' : '#4a9eff',
                  borderRadius: 2,
                  textTransform: 'uppercase',
                }}>
                  {current.pane}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {new Date(current.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <button onClick={handleCopy} style={{ ...BTN, fontSize: 10 }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Command block */}
            <div style={{
              background: '#0a0e14',
              border: '1px solid rgba(0,255,65,0.3)',
              borderRadius: 5,
              padding: '10px 12px',
              marginBottom: 10,
            }}>
              <pre style={{
                margin: 0,
                color: '#00ff41',
                fontFamily: 'monospace',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}>
                {current.command}
              </pre>
            </div>

            {/* Output snippet */}
            {current.outputSnippet && (
              <div style={{
                paddingLeft: 8,
                borderLeft: '2px solid var(--border)',
                marginBottom: 10,
              }}>
                <pre style={{
                  margin: 0,
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                }}>
                  {current.outputSnippet}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation controls */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}>
        {/* Nav buttons row */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIndex(0)}
            disabled={index === 0}
            style={{ ...BTN, opacity: index === 0 ? 0.35 : 1 }}
            title="Jump to first (Home)"
          >⏮ Start</button>

          <button
            onClick={() => step(-1)}
            disabled={index === 0}
            style={{ ...BTN, flex: 1, opacity: index === 0 ? 0.35 : 1 }}
            title="Previous (← or P)"
          >◀ Prev</button>

          <button
            onClick={() => step(1)}
            disabled={index >= total - 1}
            style={{ ...BTN, flex: 1, opacity: index >= total - 1 ? 0.35 : 1 }}
            title="Next (→ or N)"
          >▶ Next</button>

          <button
            onClick={() => setIndex(total - 1)}
            disabled={index >= total - 1}
            style={{ ...BTN, opacity: index >= total - 1 ? 0.35 : 1 }}
            title="Jump to last (End)"
          >⏭ End</button>
        </div>

        {/* Auto-play + speed row */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => setAutoPlay(a => !a)}
            disabled={index >= total - 1}
            style={autoPlay ? { ...BTN_ACTIVE, flex: 1 } : { ...BTN, flex: 1 }}
            title="Toggle auto-play (Space)"
          >
            {autoPlay ? '⏸ Pause' : '⏯ Auto-play'}
          </button>

          {/* Speed selector */}
          {([1, 2, 5] as Speed[]).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={speed === s ? { ...BTN_ACTIVE } : { ...BTN }}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      {/* Keyframe for the pulsing dot — injected once via a style tag */}
      <style>{`
        @keyframes tl-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
