import { useStore } from '../store';
import { useSecretStore } from '../stores/useSecretStore';
import { expiryStatus } from '../utils/secretScanner';
import LiveDot from './ui/LiveDot';
import { useEffect, useState } from 'react';

function useCountdown(initialSeconds: number) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => {
      setSecs((s) => (s <= 1 ? initialSeconds : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Footer() {
  const { version, isScraping, isPaused, progress, vaultStats } = useStore();
  const { secrets } = useSecretStore();
  const expiringSoon = secrets.filter((s) => s.expiresAt && expiryStatus(s.expiresAt) !== 'ok').length;

  type StatusState = 'scraping' | 'paused' | 'idle';

  function getStatus(): { state: StatusState; text: string } {
    if (isScraping && isPaused) return { state: 'paused', text: 'Paused' };
    if (isScraping && progress) return { state: 'scraping', text: `${progress.percent}%${progress.message ? ` · ${progress.message}` : ''}` };
    if (isScraping) return { state: 'scraping', text: 'Scraping…' };
    return { state: 'idle', text: 'Idle' };
  }

  const { state, text } = getStatus();
  const countdown = useCountdown(300);
  const dotStatus = state === 'scraping' ? 'online' : state === 'paused' ? 'pending' : 'offline';
  const textColor = state === 'scraping' ? '#3fb950' : state === 'paused' ? '#d29922' : 'var(--text-dim)';

  return (
    <footer
      className="flex items-center justify-between px-4 shrink-0 h-7"
      style={{
        background: 'rgba(7, 8, 15, 0.96)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
        ItsEliias // VaultCore{version ? ` v${version}` : ''}
      </span>

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono countdown-timer" style={{ color: 'var(--text-dim)' }}>
          next in <span style={{ color: 'rgba(63,185,80,0.7)' }}>{countdown}</span>
        </span>
        {expiringSoon > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{ background: 'rgba(248,81,73,0.10)', borderColor: 'rgba(248,81,73,0.25)', color: '#f85149' }}
          >
            {expiringSoon} expiring
          </span>
        )}
        {vaultStats && (
          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-dim)' }}>
            {vaultStats.noteCount.toLocaleString()} notes
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <LiveDot status={dotStatus} size={5} />
          <span className="text-[10px] font-mono" style={{ color: textColor }}>
            {text}
          </span>
        </div>
      </div>
    </footer>
  );
}
