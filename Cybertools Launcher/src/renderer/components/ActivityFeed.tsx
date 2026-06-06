import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeTime } from '../lib/utils';
import type { ActivityEntry, EcosystemEvent } from '@shared/types';
import HelpTip from './ui/HelpTip';

interface Props {
  entries: ActivityEntry[];
  ecosystemEvents: EcosystemEvent[];
  onClear: () => void;
}

// Color + label per event source category. The keys are normalised app names
// (lowercased, no spaces) so the bus's mixed appName/app field shapes both fit.
const TYPE_META: Record<string, { color: string; bg: string; label: string; name: string }> = {
  cyberlab           : { color: '#b44fff', bg: 'rgba(180,79,255,0.08)',  label: 'CL', name: 'CyberLab' },
  cyberlabcompanion  : { color: '#b44fff', bg: 'rgba(180,79,255,0.08)',  label: 'CL', name: 'CyberLab' },
  vaultscraper       : { color: '#3fb950', bg: 'rgba(63,185,80,0.08)',   label: 'VC', name: 'VaultCore' },
  vaultcore          : { color: '#3fb950', bg: 'rgba(63,185,80,0.08)',   label: 'VC', name: 'VaultCore' },
  ghostvault         : { color: '#7bb8ff', bg: 'rgba(123,184,255,0.08)', label: 'GV', name: 'GhostVault' },
  recondesk          : { color: '#d29922', bg: 'rgba(210,153,34,0.08)',  label: 'RD', name: 'ReconDesk' },
  signalboard        : { color: '#ff6b6b', bg: 'rgba(255,107,107,0.08)', label: 'SB', name: 'SignalBoard' },
  credvault          : { color: '#f78166', bg: 'rgba(247,129,102,0.08)', label: 'CV', name: 'CredVault' },
  playbookstudio     : { color: '#4a9eff', bg: 'rgba(74,158,255,0.08)',  label: 'PS', name: 'PlaybookStudio' },
  reportforge        : { color: '#3fb950', bg: 'rgba(63,185,80,0.08)',   label: 'RF', name: 'ReportForge' },
  terminallink       : { color: '#00ff41', bg: 'rgba(0,255,65,0.08)',    label: 'TL', name: 'TermLink' },
  termlink           : { color: '#00ff41', bg: 'rgba(0,255,65,0.08)',    label: 'TL', name: 'TermLink' },
  networkmap         : { color: '#d29922', bg: 'rgba(210,153,34,0.08)',  label: 'NM', name: 'NetworkMap' },
  netlab             : { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', label: 'NL', name: 'NetLab' },
  launcher           : { color: '#8b949e', bg: 'rgba(139,148,158,0.06)', label: 'LA', name: 'Launcher' },
  error              : { color: '#f85149', bg: 'rgba(248,81,73,0.08)',   label: 'ER', name: 'Error' },
};

const DEFAULT_META = { color: '#8b949e', bg: 'rgba(139,148,158,0.06)', label: '··', name: 'Other' };

// Build a friendly label per event type. Some take the event data and inject
// values, e.g. `scrape.complete` showing "12 new, 3 updated".
function labelFor(eventType: string, data: Record<string, unknown> | undefined): string {
  const d = data || {};
  switch (eventType) {
    case 'launcher.opened':              return 'Launcher opened';
    case 'launcher.backup.created':      return `Backup saved${d.file ? `: ${d.file}` : ''}` +
                                                (d.count != null ? ` (${d.count} apps${d.encrypted ? ', encrypted' : ''})` : '');
    case 'launcher.backup.restored':     return `Backup restored${d.file ? `: ${d.file}` : ''}` +
                                                (d.count != null ? ` (${d.count} files)` : '');
    case 'app:launched':                 return 'App launched';
    case 'app:closed':                   return 'App closed';
    case 'dashboard:launched':           return 'Dashboard opened';
    case 'dashboard:closed':             return 'Dashboard closed';
    case 'ghostvault.app.opened':        return 'GhostVault opened';
    case 'vaultcore.app.opened':         return 'VaultCore opened';

    case 'cyberlab.session.started':     return `Lab session started${d.lab ? `: ${d.lab}` : ''}${d.platform ? ` (${d.platform})` : ''}`.trim();
    case 'cyberlab.session.ended':       return `Lab session ended${d.lab ? `: ${d.lab}` : ''}`.trim();
    case 'cyberlab.flag.captured':       return `Flag captured${d.lab ? `: ${d.lab}` : ''}`.trim();
    case 'cyberlab.connected':           return `Connected to ${d.platform || 'platform'}`;
    case 'cyberlab.htb.connected':       return 'HackTheBox connected';
    case 'cyberlab.thm.connected':       return 'TryHackMe connected';
    case 'cyberlab.htb.synced':          return 'HTB stats synced';
    case 'cyberlab.thm.synced':          return 'THM stats synced';
    case 'cyberlab.htb.disconnected':    return 'HackTheBox disconnected';
    case 'cyberlab.thm.disconnected':    return 'TryHackMe disconnected';
    case 'lab:started':                  return `Lab started${d.name ? `: ${d.name}` : ''}`;
    case 'lab:completed':                return `Lab completed${d.name ? `: ${d.name}` : ''}`;

    case 'vaultscraper.scrape.started':  return `Scrape started: ${d.source || ''}`;
    case 'vaultscraper.scrape.complete': return `Scrape complete: ${d.source || ''}` +
                                                (d.saved != null ? ` (${d.saved} new, ${d.updated ?? 0} updated)` : '');
    case 'vaultcore.sync.completed':     return `Sync completed: ${d.source || ''}`;
    case 'vaultcore.credvault.push':     return 'Pushed credentials to CredVault';

    case 'recondesk.target.added':       return `Target added: ${d.name || ''}`;
    case 'recondesk.credential.found':   return `Credential found on ${d.target || 'target'}${d.lab ? ` (${d.lab})` : ''}`;
    case 'recondesk.activeLab.changed':  return `Active lab: ${d.lab || ''}`;
    case 'target:completed':             return `Target completed${d.name ? `: ${d.name}` : ''}${d.ip ? ` (${d.ip})` : ''}`;

    case 'signalboard.item.saved':       return `Bookmarked: ${d.title || ''}`;
    case 'signalboard.feed.added':       return `Feed added: ${d.url || ''}`;

    case 'credvault.vault.unlocked':
    case 'vault:unlocked':               return 'Vault unlocked';
    case 'credvault.vault.locked':
    case 'vault:locked':                 return d.reason ? `Vault locked (${d.reason})` : 'Vault locked';
    case 'credential:added':
    case 'credvault.credential.added':   return `Credential added${d.service ? `: ${d.service}` : ''}`;
    case 'credvault.pending.received':   return `Pending: ${d.count || 1} credential(s)`;
    case 'credvault.security.twofactor.enabled':  return '2FA enabled';
    case 'credvault.security.twofactor.disabled': return '2FA disabled';
    case 'credvault.security.recovery.generated': return 'Recovery key generated';

    case 'ghostvault.note.created':      return `Note created: ${d.title || ''}`;
    case 'ghostvault.vault.opened':      return `Vault opened: ${d.name || ''}`;
    case 'ghostvault:note-saved':        return `Note saved${d.labTitle ? ` for ${d.labTitle}` : ''}`;

    case 'playbookstudio.playbook.run':
    case 'playbook:started':             return `Playbook started${d.name ? `: ${d.name}` : ''}`;
    case 'playbook:saved':               return `Playbook saved${d.name ? `: ${d.name}` : ''}`;
    case 'playbook:completed':           return `Playbook completed${d.name ? `: ${d.name}` : ''}`;
    case 'reportforge.report.exported':  return `Report exported: ${d.title || ''}`;
    case 'terminallink.command':
    case 'terminallink:command':         return d.cmd ? `$ ${String(d.cmd).slice(0, 60)}` :
                                                d.command ? `$ ${String(d.command).slice(0, 60)}` : 'Command run';
    case 'networkmap.scan.imported':     return `Scan imported: ${d.host || ''}`;
    case 'graph:saved':                  return `Graph saved${d.name ? `: ${d.name}` : ''}`;
    case 'graph:exported':               return `Graph exported${d.name ? `: ${d.name}` : ''}${d.format ? ` (${d.format})` : ''}`;
    case 'graph:deleted':                return `Graph deleted${d.id ? `: ${d.id}` : ''}`;
    case 'netlab.lab.started':           return `Lab started: ${d.name || ''}`;
    case 'lab:saved':                    return `Lab saved${d.title ? `: ${d.title}` : ''}`;
    case 'progress:updated':             return 'Lab progress updated';

    default:                             return eventType;
  }
}

// Normalise the two field shapes the bus has historically used.
function normaliseEvent(e: EcosystemEvent) {
  const raw = e as unknown as Record<string, unknown>;
  const appName    = (raw.appName ?? raw.app ?? 'unknown') as string;
  const eventType  = (raw.eventType ?? raw.event ?? '')   as string;
  const data       = (raw.data as Record<string, unknown> | undefined);
  const ts         = (raw.timestamp ?? '') as string;
  const key        = appName.toLowerCase().replace(/[ _-]/g, '');
  return { appName, eventType, data, ts, key };
}

interface FeedItem {
  ts: string;
  key: string;
  text: string;
  appName: string;
  source: 'launcher' | 'ecosystem';
  data?: Record<string, unknown>;
}

function buildFeed(entries: ActivityEntry[], events: EcosystemEvent[]): FeedItem[] {
  const items: FeedItem[] = [
    ...entries.map(e => ({
      ts: e.timestamp, key: (e.type || 'launcher').toLowerCase(),
      text: e.text, appName: 'Launcher', source: 'launcher' as const,
    })),
    ...events.map(e => {
      const n = normaliseEvent(e);
      return {
        ts: n.ts, key: n.key,
        text: labelFor(n.eventType, n.data),
        appName: TYPE_META[n.key]?.name || n.appName,
        source: 'ecosystem' as const,
        data: n.data,
      };
    }),
  ];
  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

export default function ActivityFeed({ entries, ecosystemEvents, onClear }: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const allFeed = useMemo(() => buildFeed(entries, ecosystemEvents), [entries, ecosystemEvents]);

  // App keys present in the current feed for the filter row
  const presentApps = useMemo(() => {
    const set = new Set<string>();
    allFeed.forEach(i => set.add(i.key));
    return Array.from(set);
  }, [allFeed]);

  const feed = useMemo(() => {
    const filtered = filter ? allFeed.filter(i => i.key === filter) : allFeed;
    return filtered.slice(0, 100);
  }, [allFeed, filter]);

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold font-mono"
            style={{ color: '#4a5568' }}>
            Activity
          </span>
          <span className="text-[10px] font-mono tabular-nums" style={{ color: '#4a5568' }}>
            · {allFeed.length}
          </span>
          <HelpTip
            title="Activity feed"
            body="Live stream of ecosystem events from every CyberOS app — launches, scrapes, captures, unlocks. Filter by app or click a row to inspect the raw event payload."
          />
        </div>
        {allFeed.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] font-mono transition-all hover:opacity-80 px-2 py-0.5 rounded"
            style={{ color: '#4a5568', border: '1px solid rgba(42,51,71,0.6)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter chips */}
      {presentApps.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded transition-all"
            style={{
              background: filter === null ? 'rgba(210,153,34,0.15)' : 'rgba(42,51,71,0.35)',
              color: filter === null ? '#d29922' : '#8b949e',
              border: `1px solid ${filter === null ? 'rgba(210,153,34,0.35)' : 'rgba(42,51,71,0.5)'}`,
            }}
          >
            All
          </button>
          {presentApps.map(k => {
            const meta = TYPE_META[k] ?? DEFAULT_META;
            const active = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(active ? null : k)}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded transition-all"
                style={{
                  background: active ? `${meta.color}25` : 'rgba(42,51,71,0.35)',
                  color: active ? meta.color : '#8b949e',
                  border: `1px solid ${active ? `${meta.color}50` : 'rgba(42,51,71,0.5)'}`,
                }}
                title={meta.name}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(42,51,71,0.6) transparent' }}>

        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="text-[10px] font-mono" style={{ color: '#4a5568' }}>
              {filter ? `No ${TYPE_META[filter]?.name || filter} activity yet` : 'No activity yet'}
            </div>
            <div className="text-[9px]" style={{ color: '#4a5568' }}>
              Events appear here as apps run
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feed.map((item, i) => {
              const meta = TYPE_META[item.key] ?? DEFAULT_META;
              const isOpen = expanded === i;
              const hasData = item.data && Object.keys(item.data).length > 0;
              return (
                <motion.div
                  key={`${item.ts}-${i}`}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded"
                  style={{ background: meta.bg, border: `1px solid ${meta.color}18` }}
                >
                  <button
                    onClick={() => hasData && setExpanded(isOpen ? null : i)}
                    className="w-full flex items-start gap-2 py-1.5 px-2 text-left"
                    style={{ background: 'transparent', border: 'none', cursor: hasData ? 'pointer' : 'default' }}
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
                        {hasData && <span style={{ marginLeft: 6, opacity: 0.7 }}>{isOpen ? '▴' : '▾'}</span>}
                      </div>
                    </div>
                  </button>

                  {/* Expanded data payload */}
                  {isOpen && hasData && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-2 pb-2 -mt-0.5"
                    >
                      <pre className="text-[9px] font-mono p-1.5 rounded overflow-x-auto"
                        style={{ background: 'rgba(7,8,15,0.6)', color: '#8b949e', border: '1px solid rgba(42,51,71,0.45)' }}>
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
