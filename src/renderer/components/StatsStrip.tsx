import { useLauncherStore } from '../store';

export default function StatsStrip() {
  const config = useLauncherStore(s => s.config);
  const clStatus = config?.cyberlab_status;
  const vsStatus = config?.vaultscraper_status;

  const streak     = clStatus?.streak       ?? 0;
  const labsDone   = clStatus?.labsDone     ?? 0;
  const noteCount  = vsStatus?.vaultNoteCount ?? 0;
  const sources    = vsStatus?.totalSources   ?? 0;

  const stats = [
    { label: 'Streak',  value: streak    > 0 ? `${streak}d`  : '—' },
    { label: 'Labs',    value: labsDone  > 0 ? `${labsDone}` : '—' },
    { label: 'Notes',   value: noteCount > 0 ? `${noteCount}` : '—' },
    { label: 'Sources', value: sources   > 0 ? `${sources}`  : '—' },
  ];

  return (
    <div className="grid grid-cols-4 border-b" style={{ borderColor: 'var(--border)' }}>
      {stats.map((s, i) => (
        <div key={s.label}
          className={`flex flex-col items-center py-2.5 gap-0.5 ${i < 3 ? 'border-r' : ''}`}
          style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-bold font-mono"
            style={{ background: 'var(--stat-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {s.value}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
