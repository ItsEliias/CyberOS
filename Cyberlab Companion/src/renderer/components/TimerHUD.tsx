import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type TimerMode = 'countup' | 'countdown';

export default function TimerHUD() {
  const { tabs, activeTabId, updateSession } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [mode, setMode] = useState<TimerMode>('countup');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(session?.timer?.elapsed ?? 0);
  const [countdownTarget, setCountdownTarget] = useState(session?.timer?.totalSeconds ?? 7200);
  const [showControls, setShowControls] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync elapsed from session on mount / tab change
  useEffect(() => {
    setElapsed(session?.timer?.elapsed ?? 0);
    setCountdownTarget(session?.timer?.totalSeconds ?? 7200);
    const sessionRunning = session?.timer?.running ?? false;
    setRunning(sessionRunning);
  }, [activeTabId]);

  // Auto-start when session is active and has a lab
  useEffect(() => {
    const hasActiveLab = session?.labName && session.labName !== 'New Session';
    if (hasActiveLab && !running && elapsed === 0) {
      setRunning(true);
    }
  }, [activeTabId]);

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // Persist to session every 10s
          if (next % 10 === 0 && activeTabId && session) {
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

  // Persist running state
  useEffect(() => {
    if (activeTabId && session) {
      updateSession(activeTabId, {
        timer: { ...session.timer, elapsed, running },
      });
    }
  }, [running]);

  function reset() {
    setRunning(false);
    setElapsed(0);
    if (activeTabId && session) {
      updateSession(activeTabId, { timer: { ...session.timer, elapsed: 0, running: false } });
    }
  }

  function applyTarget() {
    const parts = targetInput.split(':').map(Number);
    let secs = 0;
    if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) secs = parts[0] * 3600 + parts[1] * 60;
    else secs = (parts[0] || 0) * 60;
    if (secs > 0) {
      setCountdownTarget(secs);
      if (activeTabId && session) {
        updateSession(activeTabId, { timer: { ...session.timer, totalSeconds: secs } });
      }
    }
    setEditingTarget(false);
  }

  const displaySeconds = mode === 'countup' ? elapsed : Math.max(0, countdownTarget - elapsed);
  const isWarning = mode === 'countdown' && displaySeconds < 300 && displaySeconds > 0;
  const isExpired = mode === 'countdown' && displaySeconds === 0 && elapsed > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { setShowControls(false); setEditingTarget(false); }}
    >
      <motion.div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer select-none"
        style={{
          background: 'var(--bg3)',
          border: `1px solid ${isWarning || isExpired ? 'var(--error)' : 'var(--border)'}`,
          color: isWarning || isExpired ? 'var(--error)' : 'var(--text)',
        }}
        animate={isWarning ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 1, repeat: isWarning ? Infinity : 0 }}
        onClick={() => setMode(m => m === 'countup' ? 'countdown' : 'countup')}
      >
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: running ? 'var(--success)' : 'var(--text-muted)' }}
        />
        <span className="font-mono text-xs tabular-nums">{formatTime(displaySeconds)}</span>
        <span className="text-[10px] opacity-50">{mode === 'countup' ? '+' : '-'}</span>
      </motion.div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-9 z-50 panel p-2 flex flex-col gap-1.5 min-w-[160px]"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="flex gap-1">
              <button
                className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${running ? 'btn-ghost' : 'btn-accent'}`}
                onClick={e => { e.stopPropagation(); setRunning(r => !r); }}
              >
                {running ? 'Pause' : 'Start'}
              </button>
              <button className="text-xs px-2 py-1 rounded btn-ghost" onClick={e => { e.stopPropagation(); reset(); }}>
                Reset
              </button>
            </div>
            <div className="flex gap-1">
              {(['countup', 'countdown'] as TimerMode[]).map(m => (
                <button
                  key={m}
                  className={`flex-1 text-xs px-1 py-1 rounded transition-colors ${mode === m ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'btn-ghost'}`}
                  onClick={e => { e.stopPropagation(); setMode(m); }}
                >
                  {m === 'countup' ? 'Count Up' : 'Count Down'}
                </button>
              ))}
            </div>
            {mode === 'countdown' && (
              <div>
                {editingTarget ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      className="flex-1 text-xs font-mono"
                      placeholder="H:MM:SS"
                      onKeyDown={e => e.key === 'Enter' && applyTarget()}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                    <button className="btn-accent text-xs px-2" onClick={e => { e.stopPropagation(); applyTarget(); }}>Set</button>
                  </div>
                ) : (
                  <button
                    className="w-full text-xs text-[var(--text-muted)] btn-ghost py-1"
                    onClick={e => { e.stopPropagation(); setTargetInput(formatTime(countdownTarget)); setEditingTarget(true); }}
                  >
                    Target: {formatTime(countdownTarget)}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
