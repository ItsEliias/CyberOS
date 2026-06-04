import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface TimerCardProps {
  onStop: () => void;
}

export default function TimerCard({ onStop }: TimerCardProps) {
  const { tabs, activeTabId, updateSession } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [elapsed, setElapsed] = useState(session?.timer?.elapsed ?? 0);
  const [running, setRunning] = useState(session?.timer?.running ?? false);
  const [mode] = useState<'countup' | 'countdown'>('countup');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync from session on tab change
  useEffect(() => {
    setElapsed(session?.timer?.elapsed ?? 0);
    setRunning(session?.timer?.running ?? false);
  }, [activeTabId]);

  // Auto-start when session has a real lab
  useEffect(() => {
    const hasLab = session?.labName && session.labName !== 'New Session';
    if (hasLab && !running && elapsed === 0) {
      setRunning(true);
    }
  }, [activeTabId, session?.labName]);

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (next % 5 === 0 && activeTabId && session) {
            updateSession(activeTabId, {
              timer: { ...session.timer, elapsed: next, running: true },
            });
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Persist running state changes
  useEffect(() => {
    if (activeTabId && session) {
      updateSession(activeTabId, {
        timer: { ...session.timer, elapsed, running },
      });
    }
  }, [running]);

  function toggle() {
    setRunning(r => !r);
  }

  const countdownTarget = session?.timer?.totalSeconds ?? 7200;
  const displaySeconds = mode === 'countup' ? elapsed : Math.max(0, countdownTarget - elapsed);
  const isWarning = mode === 'countdown' && displaySeconds < 600 && displaySeconds > 0;
  const isCritical = mode === 'countdown' && displaySeconds < 300 && displaySeconds > 0;

  const timerColor = isCritical
    ? 'var(--error)'
    : isWarning
    ? 'var(--warning)'
    : 'var(--accent)';

  const glowColor = isCritical
    ? 'rgba(248,81,73,0.45)'
    : isWarning
    ? 'rgba(210,153,34,0.35)'
    : 'rgba(180,79,255,0.35)';

  return (
    <motion.div
      className="p-3 rounded-xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%)',
        border: `1px solid ${isCritical ? 'rgba(248,81,73,0.4)' : isWarning ? 'rgba(210,153,34,0.3)' : 'rgba(180,79,255,0.2)'}`,
        boxShadow: `0 0 20px ${glowColor}`,
      }}
      animate={isCritical ? {
        boxShadow: ['0 0 20px rgba(248,81,73,0.45)', '0 0 35px rgba(248,81,73,0.65)', '0 0 20px rgba(248,81,73,0.45)'],
      } : {}}
      transition={{ duration: 1, repeat: isCritical ? Infinity : 0 }}
    >
      {/* Subtle radial glow behind timer */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 40%, ${glowColor.replace('0.35', '0.08')} 0%, transparent 65%)`,
      }} />

      {/* Time display */}
      <div
        className="text-3xl font-mono font-bold tabular-nums text-center mb-1 relative"
        style={{
          color: timerColor,
          letterSpacing: '0.06em',
          textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor.replace('0.35', '0.18')}`,
        }}
      >
        {formatTime(displaySeconds)}
      </div>

      <div className="text-center text-xs mb-3 relative" style={{ color: 'var(--text-muted)' }}>
        {running ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: timerColor, display: 'inline-block' }} />
            {mode === 'countup' ? 'Elapsed' : 'Remaining'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Paused</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 relative">
        <button
          className={`flex-1 text-xs py-1.5 rounded-lg transition-all duration-200 ${
            running ? 'btn-ghost' : 'btn-accent'
          }`}
          style={{
            borderRadius: '8px',
            ...(running ? {} : { boxShadow: '0 0 12px rgba(180,79,255,0.3)' }),
          }}
          onClick={toggle}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          className="flex-1 text-xs py-1.5 rounded-lg btn-ghost"
          style={{
            color: 'var(--error)',
            borderColor: 'rgba(248,81,73,0.35)',
            borderRadius: '8px',
          }}
          onClick={onStop}
        >
          Stop
        </button>
      </div>
    </motion.div>
  );
}
