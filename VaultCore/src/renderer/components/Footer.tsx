import { useStore } from '../store';
import { useSecretStore } from '../stores/useSecretStore';
import { expiryStatus } from '../utils/secretScanner';

export default function Footer() {
  const { version, isScraping, isPaused, progress, vaultStats } = useStore();
  const { secrets } = useSecretStore();
  const expiringSoon = secrets.filter((s) => s.expiresAt && expiryStatus(s.expiresAt) !== 'ok').length;

  let statusText = 'Idle';
  let statusColor = 'var(--text-dim)';

  if (isScraping && isPaused) {
    statusText = 'Paused';
    statusColor = '#d29922';
  } else if (isScraping && progress) {
    statusText = `Scraping — ${progress.percent}% ${progress.message ? `· ${progress.message}` : ''}`;
    statusColor = '#3fb950';
  } else if (isScraping) {
    statusText = 'Scraping…';
    statusColor = '#3fb950';
  }

  return (
    <footer className="flex items-center justify-between px-4 border-t shrink-0 h-7"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>

      <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
        ItsEliias // VaultCore{version ? ` v${version}` : ''}
      </span>

      <div className="flex items-center gap-3">
        {expiringSoon > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149' }}>
            {expiringSoon} expiring
          </span>
        )}
        {vaultStats && (
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            {vaultStats.noteCount.toLocaleString()} notes
          </span>
        )}
        <span className="text-[10px]" style={{ color: statusColor }}>
          {statusText}
        </span>
      </div>
    </footer>
  );
}
