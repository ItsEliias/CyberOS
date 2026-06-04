import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import type { Finding, SessionFindings } from '@shared/types';
import Badge from '../ui/Badge';
import SectionHeader from '../ui/SectionHeader';

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
  ports: '⬡', credentials: '⚿', flags: '⚑', users: '◎',
  cves: '⚠', hashes: '#', files: '□', services: '⚙',
};

type BadgeVariant = 'info' | 'danger' | 'success' | 'purple' | 'warning' | 'default';

const CATEGORY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  ports: 'info', credentials: 'danger', flags: 'success',
  users: 'purple', cves: 'warning', hashes: 'warning',
  files: 'default', services: 'info',
};

function getCategoryLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

interface FlatFinding extends Finding {
  category: keyof Omit<SessionFindings, 'notes'>;
}

function flattenFindings(findings: SessionFindings): FlatFinding[] {
  const keys: Array<keyof Omit<SessionFindings, 'notes'>> = [
    'ports', 'credentials', 'flags', 'users', 'cves', 'hashes', 'files', 'services',
  ];
  const result: FlatFinding[] = [];
  for (const key of keys) {
    const arr = findings[key] as Finding[];
    if (Array.isArray(arr)) {
      for (const f of arr) result.push({ ...f, category: key });
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
      <div className="flex items-center justify-center h-full text-sm" style={{ color: '#484f58' }}>
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
              : finding.category === 'credentials' ? 'credential' : 'card',
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
    for (const f of filtered.filter(f => !pushed.has(f.id))) {
      await pushToReconDesk(f);
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(7,8,15,0.7)' }}
      >
        <SectionHeader
          title="Findings"
          subtitle={`${all.length} total`}
          accent="#b44fff"
        />
        <div className="flex-1" />
        {filtered.length > 0 && (
          <button className="btn-accent text-xs px-3 py-1.5" onClick={pushAll}>
            Send All → ReconDesk
          </button>
        )}
      </div>

      {/* Category filter bar */}
      <div
        className="flex items-center gap-1.5 px-4 py-2 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(7,8,15,0.4)' }}
      >
        <button
          className="text-[11px] px-2.5 py-1 rounded-sm flex-shrink-0 transition-all"
          style={{
            background: filter === 'all' ? 'rgba(180,79,255,0.1)' : 'transparent',
            color: filter === 'all' ? '#b44fff' : '#484f58',
            border: filter === 'all' ? '1px solid rgba(180,79,255,0.25)' : '1px solid transparent',
            fontWeight: 500,
          }}
          onClick={() => setFilter('all')}
        >
          All ({all.length})
        </button>
        {(['ports','credentials','flags','users','cves','hashes','files','services'] as const).map(cat => {
          const count = counts[cat];
          if (count === 0) return null;
          const color = CATEGORY_COLORS[cat];
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              className="text-[11px] px-2.5 py-1 rounded-sm flex-shrink-0 transition-all flex items-center gap-1"
              style={{
                background: isActive ? `${color}18` : 'transparent',
                color: isActive ? color : '#484f58',
                border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                fontWeight: 500,
              }}
              onClick={() => setFilter(cat)}
            >
              <span style={{ fontSize: 10 }}>{CATEGORY_ICONS[cat]}</span>
              {getCategoryLabel(cat)} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: '#484f58' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">No {filter === 'all' ? '' : filter} findings yet</span>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div
              className="grid grid-cols-12 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: '#484f58', background: 'rgba(7,8,15,0.5)', borderBottom: '1px solid var(--border-default)' }}
            >
              <div className="col-span-2">Type</div>
              <div className="col-span-5">Value</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-1 text-right">Act.</div>
            </div>

            <AnimatePresence>
              {filtered.map(finding => {
                const color = CATEGORY_COLORS[finding.category] || 'var(--accent)';
                const isExpanded = expanded === finding.id;
                const wasPushed = pushed.has(finding.id);
                const badgeVariant = (CATEGORY_BADGE_VARIANT[finding.category] || 'default') as BadgeVariant;

                return (
                  <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.12 }}
                    style={{ borderBottom: '1px solid rgba(42,51,71,0.35)' }}
                  >
                    <div
                      className="grid grid-cols-12 px-4 py-2.5 text-xs cursor-pointer transition-colors"
                      style={{
                        background: isExpanded ? 'rgba(13,14,24,0.8)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!isExpanded) e.currentTarget.style.background = 'rgba(13,14,24,0.5)';
                      }}
                      onMouseLeave={e => {
                        if (!isExpanded) e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={() => setExpanded(isExpanded ? null : finding.id)}
                    >
                      <div className="col-span-2 flex items-center">
                        <Badge variant={badgeVariant}>
                          {CATEGORY_ICONS[finding.category]} {getCategoryLabel(finding.category).slice(0, -1)}
                        </Badge>
                      </div>

                      <div className="col-span-5 flex items-center gap-1">
                        <span className="font-mono truncate" style={{ color: '#e6edf3' }}>
                          {finding.value}
                        </span>
                        {finding.validated && (
                          <span className="text-[10px]" style={{ color: '#3fb950' }}>✓</span>
                        )}
                      </div>

                      <div className="col-span-2 flex items-center text-[11px]" style={{ color: '#484f58' }}>
                        AI-detected
                      </div>

                      <div className="col-span-2 flex items-center font-mono text-[11px] tabular-nums" style={{ color: '#484f58' }}>
                        {new Date(finding.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="col-span-1 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                          style={{ border: 'none', background: 'transparent', color: '#484f58', fontSize: 12 }}
                          title="Copy"
                          onMouseEnter={e => (e.currentTarget.style.color = '#8b949e')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#484f58')}
                          onClick={() => copyValue(finding.value)}
                        >
                          ⎘
                        </button>
                        <button
                          className="w-6 h-6 flex items-center justify-center rounded transition-colors text-xs font-mono"
                          style={{
                            border: 'none', background: 'transparent',
                            color: wasPushed ? '#3fb950' : pushing === finding.id ? '#484f58' : '#b44fff',
                          }}
                          title="Send to ReconDesk"
                          onClick={() => !wasPushed && pushToReconDesk(finding)}
                          disabled={wasPushed || pushing === finding.id}
                        >
                          {wasPushed ? '✓' : pushing === finding.id ? '…' : '→'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4 pb-3"
                        style={{ background: 'rgba(13,14,24,0.8)', borderTop: '1px solid rgba(42,51,71,0.35)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3 pt-2.5">
                          <span style={{ color: '#484f58', fontSize: 11 }}>Full value:</span>
                          <code
                            className="font-mono text-xs flex-1 min-w-0"
                            style={{ color, userSelect: 'text', WebkitUserSelect: 'text', wordBreak: 'break-all' }}
                          >
                            {finding.value}
                          </code>
                          <button className="btn-ghost text-[10px] px-2 py-0.5" onClick={() => copyValue(finding.value)}>
                            Copy
                          </button>
                          {!wasPushed && (
                            <button
                              className="btn-accent text-[10px] px-2 py-0.5"
                              onClick={() => pushToReconDesk(finding)}
                              disabled={pushing === finding.id}
                            >
                              {pushing === finding.id ? '...' : 'Send to ReconDesk'}
                            </button>
                          )}
                          {wasPushed && (
                            <span className="text-[10px]" style={{ color: '#3fb950' }}>✓ Sent</span>
                          )}
                        </div>
                      </motion.div>
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
