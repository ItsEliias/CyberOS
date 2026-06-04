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
  const [utcTime, setUtcTime] = useState(getUTC());
  const [stats, setStats]     = useState({ words: 0, chars: 0, readMins: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setStats(calcStats(editorContent)), 300);
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
