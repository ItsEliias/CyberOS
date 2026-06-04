/**
 * useTimer — session timer hook
 * Manages count-up and countdown modes with persistence every 5 seconds.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export type TimerMode = 'countup' | 'countdown';

export interface UseTimerReturn {
  elapsed: number;
  displaySeconds: number;
  formatted: string;
  running: boolean;
  mode: TimerMode;
  isWarning: boolean;       // countdown < 300s
  isCritical: boolean;      // countdown < 120s (pulses)
  isExpired: boolean;
  countdownTarget: number;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setMode: (m: TimerMode) => void;
  setCountdownTarget: (secs: number) => void;
}

export function useTimer(tabId: string | null): UseTimerReturn {
  const { tabs, updateSession } = useStore();
  const tab = tabs.find(t => t.id === tabId);
  const session = tab?.session;

  const [elapsed, setElapsed] = useState<number>(session?.timer?.elapsed ?? 0);
  const [running, setRunning] = useState<boolean>(session?.timer?.running ?? false);
  const [mode, setModeState] = useState<TimerMode>('countup');
  const [countdownTarget, setCountdownTargetState] = useState<number>(
    session?.timer?.totalSeconds ?? 7200
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistCountRef = useRef(0);

  // Sync from session on tab change
  useEffect(() => {
    if (!session) return;
    setElapsed(session.timer?.elapsed ?? 0);
    setRunning(session.timer?.running ?? false);
    setCountdownTargetState(session.timer?.totalSeconds ?? 7200);
  }, [tabId]);

  // Auto-start when a real lab session begins
  useEffect(() => {
    const hasLab = session?.labName && session.labName !== 'New Session';
    if (hasLab && !running && elapsed === 0) {
      setRunning(true);
    }
  }, [tabId, session?.labName]);

  // Tick every second
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          persistCountRef.current += 1;
          // Persist every 5 seconds
          if (persistCountRef.current >= 5 && tabId && session) {
            persistCountRef.current = 0;
            updateSession(tabId, {
              timer: { ...session.timer, elapsed: next, running: true },
            });
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Persist running state changes
  useEffect(() => {
    if (tabId && session) {
      updateSession(tabId, {
        timer: { ...session.timer, elapsed, running },
      });
    }
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => {
    setRunning(false);
    if (tabId && session) {
      updateSession(tabId, { timer: { ...session.timer, elapsed, running: false } });
    }
  }, [tabId, session, elapsed]);
  const toggle = useCallback(() => setRunning(r => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    if (tabId && session) {
      updateSession(tabId, { timer: { ...session.timer, elapsed: 0, running: false } });
    }
  }, [tabId, session]);
  const setMode = useCallback((m: TimerMode) => setModeState(m), []);
  const setCountdownTarget = useCallback((secs: number) => {
    setCountdownTargetState(secs);
    if (tabId && session) {
      updateSession(tabId, { timer: { ...session.timer, totalSeconds: secs } });
    }
  }, [tabId, session]);

  const displaySeconds = mode === 'countup'
    ? elapsed
    : Math.max(0, countdownTarget - elapsed);

  const isWarning = mode === 'countdown' && displaySeconds < 300 && displaySeconds > 0;
  const isCritical = mode === 'countdown' && displaySeconds < 120 && displaySeconds > 0;
  const isExpired = mode === 'countdown' && displaySeconds === 0 && elapsed > 0;

  return {
    elapsed,
    displaySeconds,
    formatted: formatSeconds(displaySeconds),
    running,
    mode,
    isWarning,
    isCritical,
    isExpired,
    countdownTarget,
    start,
    pause,
    toggle,
    reset,
    setMode,
    setCountdownTarget,
  };
}
