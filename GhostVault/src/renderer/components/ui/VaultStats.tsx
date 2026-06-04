// GhostVault — Vault stat widgets (progress ring + sparkline)
// Used by VaultView stats row

import { useEffect, useState } from 'react';
import type { NoteFile } from '@shared/types';

// ── Animated progress ring stat card ─────────────────────────────────────────
export function VaultStatRing({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub: string | null;
}) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  // Mount animation: start at full offset (empty ring), animate to target
  const [animOffset, setAnimOffset] = useState(circ);
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setAnimOffset(circ * (1 - pct));
    });
    return () => cancelAnimationFrame(t);
  }, [circ, pct]);

  return (
    <div className="relative overflow-hidden px-3 py-2 rounded-xl flex items-center gap-3 card-hover"
      style={{ background: 'rgba(123,184,255,0.05)', border: '1px solid rgba(123,184,255,0.14)', flex: '0 0 auto' }}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      {/* SVG ring */}
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(42,51,71,0.4)" strokeWidth="3" />
        <circle
          cx="17" cy="17" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animOffset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2,0.8,0.2,1)', filter: `drop-shadow(0 0 4px ${color}55)` }}
        />
      </svg>
      <div className="flex flex-col">
        <span className="text-base font-bold font-mono tabular-nums leading-none"
          style={{ color, textShadow: `0 0 12px ${color}55` }}>{value}</span>
        <span className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-dim)' }}>{label}</span>
        {sub && (
          <span className="text-[9px] font-mono mt-0.5 max-w-[120px] truncate" style={{ color: 'rgba(107,122,153,0.55)' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Word count sparkline ──────────────────────────────────────────────────────
export function VaultWordSpark({ notes }: { notes: NoteFile[] }) {
  const totalWords = notes.reduce((sum, n) => sum + (n.wordCount ?? 0), 0);
  // Build mini bar chart from per-folder word totals (top 6 folders)
  const byFolder: Record<string, number> = {};
  for (const n of notes) {
    byFolder[n.folder] = (byFolder[n.folder] ?? 0) + (n.wordCount ?? 0);
  }
  const bars = Object.values(byFolder).slice(0, 6);
  const maxBar = Math.max(...bars, 1);

  return (
    <div className="relative overflow-hidden px-3 py-2 rounded-xl flex items-center gap-3 card-hover"
      style={{ background: 'rgba(123,184,255,0.05)', border: '1px solid rgba(123,184,255,0.14)', flex: '0 0 auto' }}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,212,255,0.45), transparent)' }} />
      <div className="flex flex-col gap-1">
        <span className="text-base font-bold font-mono tabular-nums leading-none"
          style={{ color: '#a8d4ff', textShadow: '0 0 12px rgba(168,212,255,0.35)' }}>
          {totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
        </span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Words</span>
        {/* Sparkline bars */}
        <div className="flex items-end gap-0.5 h-3">
          {bars.map((b, i) => (
            <div key={i}
              className="rounded-sm vault-spark-bar"
              style={{
                width: 4,
                height: `${Math.max(2, (b / maxBar) * 12)}px`,
                background: `rgba(168,212,255,${0.25 + (b / maxBar) * 0.55})`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
