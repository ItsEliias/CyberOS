import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import type { Finding, SessionFindings } from '@shared/types';

type FindingCategory = 'all' | 'ports' | 'credentials' | 'flags' | 'users' | 'cves' | 'hashes' | 'files' | 'services';

const CATEGORY_COLORS: Record<string, string> = {
  ports:       '#4a9eff',
  credentials: '#f85149',
  flags:       '#3fb950',
  users:       '#b44fff',
  cves:        '#d29922',
  hashes:      '#ff7a00',
  files:       '#8b949e',
  services:    '#00ffe0',
};

const CATEGORY_ICONS: Record<string, string> = {
  ports:       '🔌',
  credentials: '🔑',
  flags:       '⚑',
  users:       '👤',
  cves:        '⚠',
  hashes:      '#',
  files:       '📄',
  services:    '⚙',
};

function getCategoryLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

interface FlatFinding extends Finding {
  category: keyof Omit<SessionFindings, 'notes'>;
  sentToReconDesk?: boolean;
}

function flattenFindings(findings: SessionFindings): FlatFinding[] {
  const result: FlatFinding[] = [];
  const keys: Array<keyof Omit<SessionFindings, 'notes'>> = [
    'ports', 'credentials', 'flags', 'users', 'cves', 'hashes', 'files', 'services'
  ];
  for (const key of keys) {
    const arr = findings[key] as Finding[];
    if (Array.isArray(arr)) {
      for (const f of arr) {
        result.push({ ...f, category: key });
      }
    }
  }
  return result.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

export default function FindingsTable() {
  const { tabs, activeTabId } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;

  const [filter, setFilter] = useState<FindingCategory>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushed, setPushed] = useState<Set<string>>(new Set());

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
        No active session
      </div>
    );
  }

  const all = flattenFindings(session.findings);
  const filtered = filter === 'all' ? all : all.filter(f => f.category === filter);

  const counts: Record<string, number> = {};
  for (const key of ['ports','credentials','flags','users','cves','hashes','files','services']) {
    const arr = (session.findings as Record<string, unknown>)[key];
    counts[key] = Array.isArray(arr) ? arr.length : 0;
  }

  async function pushToReconDesk(finding: FlatFinding) {
    if (!session) return;
    setPushing(finding.id);
    try {
      await (window.electronAPI as Record<string, Function>).pushToReconDesk({
        targetName: session.labName,
        finding: {
          type: finding.category === 'ports' ? 'port'
              : finding.category === 'credentials' ? 'credential'
              : 'card',
          data: { value: finding.value, category: finding.category },
        },
      });
      setPushed(prev => new Set([...prev, finding.id]));
    } catch (e) {
      console.error('pushToReconDesk error:', e);
    } finally {
      setPushing(null);
    }
  }

  async function pushAll() {
    const unpushed = filtered.filter(f => !pushed.has(f.id));
    for (const f of unpushed) {
      await pushToReconDesk(f);
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderBottomColor: 'var(--border)', background: 'var(--bg2)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
          Findings
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ({all.length})
        </span>
        <div className="flex-1" />
        {filtered.length > 0 && (
          <button
            className="btn-accent text-xs px-3 py-1.5"
            onClick={pushAll}
          >
            Send All → ReconDesk
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1 px-4 py-2 border-b flex-shrink-0 overflow-x-auto"
        style={{ borderBottomColor: 'var(--border)' }}
      >
        <button
          className="text-xs px-2.5 py-1 rounded flex-shrink-0 transition-colors"
          style={{
            background: filter === 'all' ? 'var(--accent-dim)' : 'transparent',
            color: filter === 'all' ? 'var(--accent)' : 'var(--text-muted)',
            border: filter === 'all' ? '1px solid var(--accent-dim)' : '1px solid transparent',
          }}
          onClick={() => setFilter('all')}
        >
          All ({all.length})
        </button>
        {(['ports','credentials','flags','users','cves','hashes','files','services'] as const).map(cat => {
          const count = counts[cat];
          if (count === 0) return null;
          return (
            <button
              key={cat}
              className="text-xs px-2.5 py-1 rounded flex-shrink-0 transition-colors"
              style={{
                background: filter === cat ? CATEGORY_COLORS[cat] + '22' : 'transparent',
                color: filter === cat ? CATEGORY_COLORS[cat] : 'var(--text-muted)',
                border: filter === cat ? `1px solid ${CATEGORY_COLORS[cat]}44` : '1px solid transparent',
              }}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_ICONS[cat]} {getCategoryLabel(cat)} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
            No {filter === 'all' ? '' : filter} findings yet
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {/* Header row */}
            <div
              className="grid grid-cols-12 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)', background: 'var(--bg2)' }}
            >
              <div className="col-span-2">Type</div>
              <div className="col-span-5">Value</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <AnimatePresence>
              {filtered.map(finding => {
                const color = CATEGORY_COLORS[finding.category] || 'var(--accent)';
                const isExpanded = expanded === finding.id;
                const wasPushed = pushed.has(finding.id);

                return (
                  <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div
                      className="grid grid-cols-12 px-4 py-2.5 text-xs cursor-pointer transition-colors"
                      style={{ background: isExpanded ? 'var(--bg3)' : 'transparent' }}
                      onClick={() => setExpanded(isExpanded ? null : finding.id)}
                    >
                      {/* Type */}
                      <div className="col-span-2 flex items-center">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: color + '22', color, border: `1px solid ${color}44` }}
                        >
                          {CATEGORY_ICONS[finding.category]} {getCategoryLabel(finding.category).slice(0, -1)}
                        </span>
                      </div>

                      {/* Value */}
                      <div className="col-span-5 flex items-center">
                        <span className="font-mono truncate" style={{ color: 'var(--text)' }}>
                          {finding.value}
                        </span>
                        {finding.validated && (
                          <span className="ml-1 text-[10px]" style={{ color: '#3fb950' }}>✓</span>
                        )}
                      </div>

                      {/* Source */}
                      <div className="col-span-2 flex items-center" style={{ color: 'var(--text-muted)' }}>
                        AI-detected
                      </div>

                      {/* Time */}
                      <div className="col-span-2 flex items-center font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(finding.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                          style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                          title="Copy"
                          onClick={() => copyValue(finding.value)}
                        >
                          ⎘
                        </button>
                        <button
                          className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: wasPushed ? '#3fb950' : pushing === finding.id ? 'var(--text-muted)' : 'var(--accent)',
                          }}
                          title="Send to ReconDesk"
                          onClick={() => !wasPushed && pushToReconDesk(finding)}
                          disabled={wasPushed || pushing === finding.id}
                        >
                          {wasPushed ? '✓' : pushing === finding.id ? '…' : '→'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded row */}
                    {isExpanded && (
                      <div
                        className="px-4 pb-3 text-xs"
                        style={{ background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}
                      >
                        <div className="flex items-center gap-3 pt-2">
                          <span style={{ color: 'var(--text-muted)' }}>Full value:</span>
                          <code
                            className="font-mono"
                            style={{ color, userSelect: 'text', WebkitUserSelect: 'text' }}
                          >
                            {finding.value}
                          </code>
                          <button
                            className="btn-ghost text-[10px] px-2 py-0.5"
                            onClick={() => copyValue(finding.value)}
                          >
                            Copy
                          </button>
                          {!wasPushed && (
                            <button
                              className="btn-accent text-[10px] px-2 py-0.5"
                              onClick={() => pushToReconDesk(finding)}
                              disabled={pushing === finding.id}
                            >
                              {pushing === finding.id ? '...' : 'Save to ReconDesk'}
                            </button>
                          )}
                          {wasPushed && (
                            <span className="text-[10px]" style={{ color: '#3fb950' }}>✓ Sent to ReconDesk</span>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
