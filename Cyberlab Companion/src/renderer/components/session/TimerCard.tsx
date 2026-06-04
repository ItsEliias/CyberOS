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

  return (
    <motion.div
      className="p-3 rounded-lg"
      style={{
        background: 'var(--bg3)',
        border: `1px solid ${isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--border)'}`,
      }}
      animate={isCritical ? { borderColor: ['var(--error)', '#ff6b6b', 'var(--error)'] } : {}}
      transition={{ duration: 1, repeat: isCritical ? Infinity : 0 }}
    >
      {/* Time display */}
      <div
        className="text-3xl font-mono font-bold tabular-nums text-center mb-1"
        style={{ color: timerColor, letterSpacing: '0.05em' }}
      >
        {formatTime(displaySeconds)}
      </div>

      <div className="text-center text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {mode === 'countup' ? 'Elapsed' : 'Remaining'}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          className={`flex-1 text-xs py-1.5 rounded transition-colors ${
            running ? 'btn-ghost' : 'btn-accent'
          }`}
          onClick={toggle}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          className="flex-1 text-xs py-1.5 rounded btn-ghost"
          style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
          onClick={onStop}
        >
          Stop
        </button>
      </div>
    </motion.div>
  );
}
