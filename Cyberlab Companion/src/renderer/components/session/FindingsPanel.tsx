import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useStore } from '../../store';

const TYPE_COLORS: Record<string, string> = {
  ports:       '#4a9eff',
  credentials: '#f85149',
  flags:       '#3fb950',
  users:       '#b44fff',
  cves:        '#d29922',
  hashes:      '#ff7a00',
  files:       '#8b949e',
  services:    '#00ffe0',
};

const TYPE_ICONS: Record<string, string> = {
  ports:       '🔌',
  credentials: '🔑',
  flags:       '⚑',
  users:       '👤',
  cves:        '⚠',
  hashes:      '#',
  files:       '📄',
  services:    '⚙',
};

interface FindingsPanelProps {
  onViewAll: () => void;
}

export default function FindingsPanel({ onViewAll }: FindingsPanelProps) {
  const { tabs, activeTabId } = useStore();
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushed, setPushed] = useState<Set<string>>(new Set());

  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;

  if (!session) return null;

  const findings = session.findings;
  const keys = ['ports', 'credentials', 'flags', 'users', 'cves', 'hashes', 'files', 'services'] as const;

  type FindingKey = typeof keys[number];

  interface FlatFinding {
    id: string;
    value: string;
    addedAt: string;
    category: FindingKey;
  }

  const flat: FlatFinding[] = [];
  for (const key of keys) {
    const arr = findings[key];
    if (Array.isArray(arr)) {
      for (const f of arr) {
        flat.push({ ...f, category: key });
      }
    }
  }
  flat.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

  const totalCount = flat.length;
  const preview = flat.slice(0, 5);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Findings ({totalCount})
        </span>
        {totalCount > 5 && (
          <button
            className="text-[10px] btn-ghost px-2 py-0.5"
            onClick={onViewAll}
          >
            View all
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>
          No findings yet
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--bg3)' }}
        >
          <AnimatePresence>
            {preview.map((finding, idx) => {
              const color = TYPE_COLORS[finding.category] || 'var(--accent)';
              const wasPushed = pushed.has(finding.id);

              return (
                <motion.div
                  key={finding.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, delay: idx * 0.03 }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs"
                  style={{
                    borderBottom: idx < preview.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ color, flexShrink: 0, fontSize: '11px' }}>
                    {TYPE_ICONS[finding.category]}
                  </span>
                  <span
                    className="font-mono flex-1 truncate"
                    style={{ color: 'var(--text-dim)', fontSize: '11px' }}
                    title={finding.value}
                  >
                    {finding.value}
                  </span>
                  <button
                    className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded transition-colors"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: wasPushed ? 'var(--success)' : pushing === finding.id ? 'var(--text-muted)' : 'var(--accent)',
                      cursor: wasPushed ? 'default' : 'pointer',
                    }}
                    title={wasPushed ? 'Sent to ReconDesk' : 'Send to ReconDesk'}
                    onClick={() => !wasPushed && pushToReconDesk(finding)}
                    disabled={wasPushed || pushing === finding.id}
                  >
                    {wasPushed ? '✓' : pushing === finding.id ? '…' : '→'}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Quick add button */}
      <button
        className="w-full mt-2 text-xs py-1 rounded btn-ghost"
        onClick={onViewAll}
      >
        + View / Add Findings
      </button>
    </div>
  );
}
