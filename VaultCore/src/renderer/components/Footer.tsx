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
        background: 'var(--surface-0)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: brand */}
      <span className="font-mono status-metric">
        VaultCore{version ? ` v${version}` : ''}
      </span>

      {/* Right: flat metric strip separated by · */}
      <div className="flex items-center">
        {vaultStats && vaultStats.noteCount != null && (
          <>
            <span className="font-mono status-metric tabular-nums">
              <strong>{vaultStats.noteCount.toLocaleString()}</strong> notes
            </span>
            <span className="status-sep" aria-hidden>·</span>
          </>
        )}
        <span className="font-mono status-metric countdown-timer">
          next <strong style={{ color: 'var(--accent)', opacity: 0.7 }}>{countdown}</strong>
        </span>
        {expiringSoon > 0 && (
          <>
            <span className="status-sep" aria-hidden>·</span>
            <span style={{
              fontSize: 'var(--type-caption)',
              padding: '0 5px',
              borderRadius: 3,
              background: 'rgba(248,81,73,0.10)',
              border: '1px solid rgba(248,81,73,0.20)',
              color: '#f85149',
            }}>
              {expiringSoon} expiring
            </span>
          </>
        )}
        <span className="status-sep" aria-hidden>·</span>
        <div className="flex items-center gap-1.5">
          <LiveDot status={dotStatus} size={4} />
          <span className="font-mono status-metric" style={{ color: textColor }}>
            {text}
          </span>
        </div>
      </div>
    </footer>
  );
}
