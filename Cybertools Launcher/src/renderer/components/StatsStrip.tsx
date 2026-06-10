import { useLauncherStore } from '../store';

const ALL_APP_KEYS = [
  'cyberlab', 'vaultscraper', 'ghostvault', 'recondesk', 'signalboard', 'cyberos',
  'credvault', 'playbookstudio', 'reportforge', 'terminallink', 'networkmap', 'netlab',
] as const;

export default function StatsStrip() {
  const config = useLauncherStore(s => s.config);
  const clStatus = config?.cyberlab_status;
  const vsStatus = config?.vaultscraper_status;

  const streak     = clStatus?.streak       ?? 0;
  const labsDone   = clStatus?.labsDone     ?? 0;
  const noteCount  = vsStatus?.vaultNoteCount ?? 0;

  const configuredCount = config
    ? ALL_APP_KEYS.filter(k => !!(config as Record<string, { execPath?: string } | undefined>)[k]?.execPath).length
    : 0;

  const stats = [
    { label: 'Streak',  value: streak    > 0 ? `${streak}d`  : '—' },
    { label: 'Labs',    value: labsDone  > 0 ? `${labsDone}` : '—' },
    { label: 'Notes',   value: noteCount > 0 ? `${noteCount}` : '—' },
    { label: 'Apps',    value: `${configuredCount}/${ALL_APP_KEYS.length}` },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-border-default">
      {stats.map((s, i) => (
        <div key={s.label}
          className={`flex flex-col items-center py-2.5 gap-0.5 ${i < 3 ? 'border-r border-border-default' : ''}`}>
          {/* Anti-slop: replaced gradient-clipped text with token-driven accent color.
              Soft text-shadow gives depth without the "AI dashboard" gradient tell. */}
          <span className="text-sm font-bold font-mono tabular-nums"
            style={{ color: 'var(--accent)', textShadow: '0 0 8px var(--accent-glow2)' }}>
            {s.value}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
