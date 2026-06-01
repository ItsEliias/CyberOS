import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeTime } from '../lib/utils';
import type { ActivityEntry, EcosystemEvent } from '@shared/types';

interface Props {
  entries: ActivityEntry[];
  ecosystemEvents: EcosystemEvent[];
  onClear: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  cyberlab    : '#4a9eff',
  vaultscraper: '#a371f7',
  ghostvault  : '#3fb950',
  launcher    : '#8b949e',
  error       : '#f85149',
};

const EVENT_LABELS: Record<string, string> = {
  'launcher.opened'          : 'Launcher opened',
  'cyberlab.session.started' : 'CyberLab session started',
  'cyberlab.session.ended'   : 'CyberLab session ended',
  'cyberlab.flag.captured'   : 'Flag captured',
  'vaultscraper.scrape.started'  : 'VaultCore scrape started',
  'vaultscraper.scrape.complete' : 'VaultCore scrape complete',
  'recondesk.target.added'   : 'ReconDesk: target added',
  'signalboard.item.saved'   : 'SignalBoard: item saved',
};

// Merge activity entries with ecosystem events into a unified sorted list
function buildFeed(entries: ActivityEntry[], events: EcosystemEvent[]) {
  const items = [
    ...entries.map(e => ({ ts: e.timestamp, type: e.type, text: e.text, source: 'local' as const })),
    ...events.map(e => ({
      ts    : e.timestamp,
      type  : e.appName.toLowerCase().replace(/ /g, ''),
      text  : EVENT_LABELS[e.eventType] || e.eventType,
      source: 'ecosystem' as const
    }))
  ];
  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 50);
}

export default function ActivityFeed({ entries, ecosystemEvents, onClear }: Props) {
  const feed = buildFeed(entries, ecosystemEvents);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: 'var(--text-dim)' }}>Activity</span>
        {feed.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] transition-colors hover:opacity-80"
            style={{ color: 'var(--text-dim)' }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar) transparent' }}>
        {feed.length === 0 ? (
          <div className="flex items-center justify-center h-full"
            style={{ color: 'var(--text-dim)' }}>
            <span className="text-xs">No activity yet</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feed.map((item, i) => (
              <motion.div
                key={`${item.ts}-${i}`}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 py-1.5 px-2 rounded text-[11px]"
                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                  style={{ background: TYPE_COLORS[item.type] || '#8b949e' }} />
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ color: 'var(--text-muted)' }}>{item.text}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {formatRelativeTime(item.ts) || ''}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
