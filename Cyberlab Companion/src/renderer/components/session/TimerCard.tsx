import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import type { Session } from '@shared/types';

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
  const [recentSessions, setRecentSessions] = useState<Array<{ name: string; elapsed: number }>>([]);
  const [flashState, setFlashState] = useState<'idle' | 'flashing' | 'stayed'>('idle');
  const flashedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const list = await window.electronAPI.listSessions() as Session[];
        if (Array.isArray(list)) {
          const completed = list
            .filter(s => s?.labName && s.labName !== 'New Session' && (s.timer?.elapsed ?? 0) > 0)
            .slice(-3)
            .reverse();
          setRecentSessions(completed.map(s => ({ name: s.labName, elapsed: s.timer?.elapsed ?? 0 })));
        }
      } catch {}
    }
    loadHistory();
  }, [activeTabId]);

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
  const isExpired = mode === 'countdown' && elapsed >= countdownTarget && countdownTarget > 0;

  // Flash card red 3× when countdown reaches 0, then stay red-tinted
  useEffect(() => {
    if (isExpired && !flashedRef.current) {
      flashedRef.current = true;
      setFlashState('flashing');
      // Each flash cycle is 400ms × 3 = 1200ms total
      setTimeout(() => setFlashState('stayed'), 1250);
    }
    if (!isExpired) { flashedRef.current = false; setFlashState('idle'); }
  }, [isExpired]);

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

  // SVG arc constants
  const ARC_R = 44;
  const ARC_CX = 52;
  const ARC_CY = 52;
  const ARC_STROKE = 3.5;
  const circumference = 2 * Math.PI * ARC_R;
  // For count-up we show elapsed fraction vs a 2h cap; for countdown use remaining fraction
  const arcFraction = mode === 'countdown'
    ? Math.max(0, Math.min(1, displaySeconds / Math.max(countdownTarget, 1)))
    : Math.max(0, Math.min(1, elapsed / Math.max(countdownTarget, 1)));
  const dashOffset = circumference * (1 - arcFraction);

  return (
    <motion.div
      className={`p-3 rounded-xl relative overflow-hidden ${running && !isCritical && !isWarning && !isExpired ? 'timer-border-running' : ''} ${flashState === 'flashing' ? 'timer-flash' : ''} ${flashState === 'stayed' ? 'timer-flash-stay' : ''}`}
      style={{
        background: flashState === 'stayed'
          ? 'linear-gradient(135deg, rgba(248,81,73,0.08) 0%, var(--surface-1) 100%)'
          : 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%)',
        border: `1px solid ${isExpired ? 'rgba(248,81,73,0.5)' : isCritical ? 'rgba(248,81,73,0.4)' : isWarning ? 'rgba(210,153,34,0.3)' : running ? 'rgba(63,185,80,0.55)' : 'rgba(180,79,255,0.2)'}`,
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

      {/* Progress arc SVG */}
      <div className="flex justify-center mb-1 relative" style={{ height: 104 }}>
        <svg width="104" height="104" viewBox="0 0 104 104" fill="none" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>
          {/* Track */}
          <circle
            cx={ARC_CX} cy={ARC_CY} r={ARC_R}
            stroke="rgba(42,51,71,0.45)" strokeWidth={ARC_STROKE} fill="none"
          />
          {/* Progress arc */}
          <circle
            cx={ARC_CX} cy={ARC_CY} r={ARC_R}
            stroke={timerColor}
            strokeWidth={ARC_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${ARC_CX} ${ARC_CY})`}
            style={{
              transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease',
              filter: `drop-shadow(0 0 4px ${timerColor})`,
            }}
          />
        </svg>
        {/* Time display centered inside arc */}
        <div
          className="font-mono font-bold tabular-nums text-center absolute"
          style={{
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '1.55rem',
            color: timerColor,
            letterSpacing: '0.06em',
            textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor.replace('0.35', '0.18')}`,
          }}
        >
          {formatTime(displaySeconds)}
        </div>
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

      {/* Session history chips */}
      {recentSessions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 relative flex-wrap">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: '#484f58' }}>Recent</span>
          {recentSessions.map((s, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(42,51,71,0.4)',
                border: '1px solid rgba(42,51,71,0.6)',
                color: '#8b949e',
              }}
              title={s.name}
            >
              {formatTime(s.elapsed)}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
