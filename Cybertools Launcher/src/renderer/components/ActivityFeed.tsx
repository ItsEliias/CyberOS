import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeTime } from '../lib/utils';
import type { ActivityEntry, EcosystemEvent } from '@shared/types';

interface Props {
  entries: ActivityEntry[];
  ecosystemEvents: EcosystemEvent[];
  onClear: () => void;
}

// Color + label per event source category
const TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  cyberlab      : { color: '#4a9eff', bg: 'rgba(74,158,255,0.08)',  label: 'CL' },
  vaultscraper  : { color: '#a371f7', bg: 'rgba(163,113,247,0.08)', label: 'VC' },
  ghostvault    : { color: '#d29922', bg: 'rgba(210,153,34,0.08)',  label: 'GV' },
  recondesk     : { color: '#a371f7', bg: 'rgba(163,113,247,0.08)', label: 'RD' },
  signalboard   : { color: '#4a9eff', bg: 'rgba(74,158,255,0.08)',  label: 'SB' },
  credvault     : { color: '#d29922', bg: 'rgba(210,153,34,0.08)',  label: 'CV' },
  playbookstudio: { color: '#a371f7', bg: 'rgba(163,113,247,0.08)', label: 'PS' },
  reportforge   : { color: '#a371f7', bg: 'rgba(163,113,247,0.08)', label: 'RF' },
  terminallink  : { color: '#3fb950', bg: 'rgba(63,185,80,0.08)',   label: 'TL' },
  networkmap    : { color: '#4a9eff', bg: 'rgba(74,158,255,0.08)',  label: 'NM' },
  launcher      : { color: '#8b949e', bg: 'rgba(139,148,158,0.06)', label: 'LA' },
  error         : { color: '#f85149', bg: 'rgba(248,81,73,0.08)',   label: 'ER' },
};

const DEFAULT_META = { color: '#8b949e', bg: 'rgba(139,148,158,0.06)', label: '··' };

const EVENT_LABELS: Record<string, string> = {
  'launcher.opened'              : 'Launcher opened',
  'cyberlab.session.started'     : 'CyberLab session started',
  'cyberlab.session.ended'       : 'CyberLab session ended',
  'cyberlab.flag.captured'       : 'Flag captured',
  'vaultscraper.scrape.started'  : 'VaultCore scrape started',
  'vaultscraper.scrape.complete' : 'VaultCore scrape complete',
  'recondesk.target.added'       : 'ReconDesk: target added',
  'signalboard.item.saved'       : 'SignalBoard: item saved',
};

function buildFeed(entries: ActivityEntry[], events: EcosystemEvent[]) {
  const items = [
    ...entries.map(e => ({ ts: e.timestamp, type: e.type, text: e.text })),
    ...events.map(e => ({
      ts  : e.timestamp,
      type: e.appName.toLowerCase().replace(/ /g, ''),
      text: EVENT_LABELS[e.eventType] || e.eventType,
    })),
  ];
  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 50);
}

export default function ActivityFeed({ entries, ecosystemEvents, onClear }: Props) {
  const feed = buildFeed(entries, ecosystemEvents);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold font-mono"
          style={{ color: '#4a5568' }}>
          Activity
        </span>
        {feed.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] font-mono transition-all hover:opacity-80 px-2 py-0.5 rounded"
            style={{ color: '#4a5568', border: '1px solid rgba(42,51,71,0.6)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(42,51,71,0.6) transparent' }}>

        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="text-[10px] font-mono" style={{ color: '#4a5568' }}>
              No activity yet
            </div>
            <div className="text-[9px]" style={{ color: '#4a5568' }}>
              Events appear here as apps run
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feed.map((item, i) => {
              const meta = TYPE_META[item.type] ?? DEFAULT_META;
              return (
                <motion.div
                  key={`${item.ts}-${i}`}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 py-1.5 px-2 rounded"
                  style={{ background: meta.bg, border: `1px solid ${meta.color}18` }}
                >
                  {/* Category badge */}
                  <div className="text-[8px] font-bold font-mono px-1 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                    {meta.label}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] truncate" style={{ color: '#e2e8f0' }}>
                      {item.text}
                    </div>
                    <div className="text-[9px] mt-0.5 font-mono" style={{ color: '#4a5568' }}>
                      {formatRelativeTime(item.ts) || ''}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
