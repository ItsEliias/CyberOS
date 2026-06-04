// GhostVault — Status Bar (redesigned: dark 24px, Geist Sans, soft blue accent)

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';

function getUTC(): string {
  const now = new Date();
  return now.toUTCString().slice(17, 25) + ' UTC';
}

function calcStats(text: string): { words: number; chars: number; readMins: number } {
  const t = text.trim();
  const words = t ? t.split(/\s+/).length : 0;
  return { words, chars: text.length, readMins: Math.ceil(words / 200) };
}

export default function StatusBar() {
  const { notes, vaultPath, dirty, ollamaStatus, editorContent } = useStore();
  const [utcTime, setUtcTime]   = useState(getUTC());
  const [stats, setStats]       = useState({ words: 0, chars: 0, readMins: 0 });
  const [wpm, setWpm]           = useState<number | null>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wpmTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wpmWindowRef            = useRef<{ words: number; ts: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const s = calcStats(editorContent);
      setStats(s);
      // Track WPM: record (wordCount, timestamp) window of last 10s
      const now = Date.now();
      wpmWindowRef.current.push({ words: s.words, ts: now });
      // Keep only last 10 seconds
      wpmWindowRef.current = wpmWindowRef.current.filter(e => now - e.ts < 10000);
      if (wpmWindowRef.current.length >= 2) {
        const oldest = wpmWindowRef.current[0];
        const newest = wpmWindowRef.current[wpmWindowRef.current.length - 1];
        const deltaWords = newest.words - oldest.words;
        const deltaMin = (newest.ts - oldest.ts) / 60000;
        const computed = deltaMin > 0 ? Math.round(deltaWords / deltaMin) : 0;
        if (computed > 0 && computed < 300) setWpm(computed);
      }
      // Clear WPM display after 4s of inactivity
      if (wpmTimerRef.current) clearTimeout(wpmTimerRef.current);
      wpmTimerRef.current = setTimeout(() => setWpm(null), 4000);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [editorContent]);

  const aiOnline = ollamaStatus?.running ?? false;
  const vaultActive = Boolean(vaultPath);

  return (
    <div
      className="h-6 flex items-center px-3 shrink-0 gap-3"
      style={{
        borderTop: '1px solid rgba(42,51,71,0.35)',
        background: 'rgba(7,8,15,0.88)',
        color: 'rgba(72,79,88,0.8)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {/* Vault indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vaultActive ? 'status-dot-pulse' : ''}`}
          style={{
            background: vaultActive ? '#7bb8ff' : '#484f58',
            '--pulse-rgb': '123,184,255',
          } as React.CSSProperties}
        />
        <span className="text-[10px]" style={{ color: vaultActive ? 'rgba(139,148,158,0.8)' : 'rgba(72,79,88,0.6)' }}>
          {vaultActive ? `${notes.length} notes` : 'No vault'}
        </span>
      </div>

      {/* Word count */}
      {editorContent.trim() && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'rgba(72,79,88,0.7)' }}>
            {stats.words}w · {stats.chars}c · ~{stats.readMins}m
          </span>
        </>
      )}

      {/* WPM typing indicator */}
      {wpm !== null && wpm > 0 && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span
            className="text-[10px] font-mono tabular-nums wpm-indicator"
            style={{ color: '#7bb8ff', opacity: 0.8 }}
            title="Words per minute (current typing speed)"
          >
            {wpm} wpm
          </span>
        </>
      )}

      {/* Unsaved indicator */}
      {dirty && (
        <>
          <span style={{ color: 'rgba(42,51,71,0.6)' }}>·</span>
          <span className="text-[10px] font-semibold" style={{ color: '#d29922' }}>
            Unsaved
          </span>
        </>
      )}

      {/* AI status */}
      <div className="flex items-center gap-1.5">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: aiOnline ? '#3fb950' : 'rgba(72,79,88,0.5)' }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
        <span className="text-[10px]" style={{ color: aiOnline ? '#3fb950' : 'rgba(72,79,88,0.5)' }}>
          AI {aiOnline ? 'Ready' : 'Offline'}
        </span>
      </div>

      <div className="flex-1" />

      {/* UTC clock */}
      <span
        className="text-[10px] font-mono tabular-nums"
        style={{ color: 'rgba(72,79,88,0.6)', letterSpacing: '0.02em' }}
      >
        {utcTime}
      </span>
    </div>
  );
}
