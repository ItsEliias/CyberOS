// GhostVault — Status Bar
// Bottom bar with vault stats, word count, reading time, session context, and UTC clock

import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';

function getUTC(): string {
  const now = new Date();
  return now.toUTCString().slice(17, 25) + ' UTC';
}

function calcStats(text: string): { words: number; chars: number; readMins: number } {
  const t = text.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const chars = text.length;
  const readMins = Math.ceil(words / 200);
  return { words, chars, readMins };
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
    debounceRef.current = setTimeout(() => {
      setStats(calcStats(editorContent));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [editorContent]);

  return (
    <div
      className="h-6 border-t flex items-center px-4 text-xs shrink-0"
      style={{ borderColor: 'var(--border)', background: 'rgba(10, 10, 15, 0.9)', color: 'var(--text-dim)' }}
    >
      {/* Vault status */}
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full status-dot-pulse"
          style={{ background: vaultPath ? '#7bb8ff' : '#8b949e', '--pulse-color': 'rgba(123,184,255,0.4)' } as React.CSSProperties}
        />
        <span style={{ color: 'var(--text-muted)' }}>
          {vaultPath ? `${notes.length} notes` : 'No vault'}
        </span>
      </div>

      <span className="mx-3" style={{ color: 'var(--text-dim)' }}>•</span>

      {/* Word count / reading time */}
      {editorContent.trim() && (
        <>
          <span style={{ color: 'var(--text-dim)' }}>
            {stats.words} words · {stats.chars} chars · ~{stats.readMins} min read
          </span>
          <span className="mx-3" style={{ color: 'var(--text-dim)' }}>•</span>
        </>
      )}

      {/* Dirty indicator */}
      {dirty && (
        <>
          <span style={{ color: '#d29922' }}>Unsaved changes</span>
          <span className="mx-3" style={{ color: 'var(--text-dim)' }}>•</span>
        </>
      )}

      {/* Ollama */}
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-dim)' }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
        <span style={{ color: ollamaStatus?.running ? '#3fb950' : 'var(--text-dim)' }}>
          AI {ollamaStatus?.running ? 'Ready' : 'Offline'}
        </span>
      </div>

      <div className="flex-1" />

      {/* UTC time */}
      <span className="font-mono" style={{ color: 'var(--text-dim)' }}>{utcTime}</span>
    </div>
  );
}
