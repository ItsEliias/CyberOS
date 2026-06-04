import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import type { Finding, SessionFindings } from '@shared/types';
import Badge from '../ui/Badge';
import SectionHeader from '../ui/SectionHeader';

type FindingCategory = 'all' | 'ports' | 'credentials' | 'flags' | 'users' | 'cves' | 'hashes' | 'files' | 'services';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info';

const SEVERITY_CONFIG: Array<{ id: SeverityFilter; label: string; color: string }> = [
  { id: 'all',      label: 'All',      color: '#8b949e' },
  { id: 'critical', label: 'Critical', color: '#f85149' },
  { id: 'high',     label: 'High',     color: '#ff7a00' },
  { id: 'medium',   label: 'Medium',   color: '#d29922' },
  { id: 'low',      label: 'Low',      color: '#3fb950' },
  { id: 'info',     label: 'Info',     color: '#4a9eff' },
];

function getSeverityBucket(category: string, value: string): SeverityFilter {
  const cvss = getMockCvss(category, value);
  if (cvss === null) return 'info';
  if (cvss > 9) return 'critical';
  if (cvss > 7) return 'high';
  if (cvss > 4) return 'medium';
  if (cvss > 0) return 'low';
  return 'info';
}

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

// Mock CVSS scores for demonstration — assigned based on category
function getMockCvss(category: string, value: string): number | null {
  if (category === 'cves') {
    // Use hash of the value string to get a deterministic score
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) & 0xffff;
    return parseFloat(((hash % 100) / 10).toFixed(1));
  }
  if (category === 'credentials') return 9.8;
  if (category === 'flags') return null;
  return null;
}

function cvssColor(score: number): string {
  if (score <= 3) return '#3fb950';
  if (score <= 6) return '#d29922';
  if (score <= 8) return '#ff7a00';
  return '#f85149';
}

function cvssLabel(score: number): string {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Med';
  if (score <= 8) return 'High';
  return 'Crit';
}

export default function FindingsTable() {
  const { tabs, activeTabId } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;

  const [filter, setFilter] = useState<FindingCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushed, setPushed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [csvState, setCsvState] = useState<'idle' | 'progress' | 'done'>('idle');

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    const allSelected = ids.every(id => selected.has(id));
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ids));
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: '#484f58' }}>
        No active session
      </div>
    );
  }

  const all = flattenFindings(session.findings);
  const filtered = useMemo(() => {
    let result = filter === 'all' ? all : all.filter(f => f.category === filter);
    if (severityFilter !== 'all') {
      result = result.filter(f => getSeverityBucket(f.category, f.value) === severityFilter);
    }
    return result;
  }, [all, filter, severityFilter]);

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

  function exportCsv() {
    if (csvState !== 'idle') return;
    setCsvState('progress');
    const rows = [
      ['Type', 'Value', 'CVSS', 'Severity', 'Time'].join(','),
      ...filtered.map(f => {
        const cvss = getMockCvss(f.category, f.value);
        const sev = getSeverityBucket(f.category, f.value);
        const time = new Date(f.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
        return [esc(f.category), esc(f.value), cvss !== null ? cvss.toFixed(1) : '', sev, time].join(',');
      }),
    ].join('\n');
    setTimeout(() => {
      navigator.clipboard.writeText(rows).catch(() => {});
      setCsvState('done');
      setTimeout(() => setCsvState('idle'), 2400);
    }, 1200);
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
          <>
            <button
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
              style={{
                background: csvState === 'done' ? 'rgba(63,185,80,0.1)' : csvState === 'progress' ? 'rgba(180,79,255,0.07)' : 'rgba(42,51,71,0.3)',
                border: `1px solid ${csvState === 'done' ? 'rgba(63,185,80,0.3)' : 'rgba(42,51,71,0.5)'}`,
                color: csvState === 'done' ? '#3fb950' : csvState === 'progress' ? '#b44fff' : '#8b949e',
                cursor: csvState !== 'idle' ? 'default' : 'pointer',
              }}
              onClick={exportCsv}
              disabled={csvState !== 'idle'}
              title="Export findings to CSV (copies to clipboard)"
            >
              {csvState === 'progress' && <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" />}
              {csvState === 'progress' ? 'Exporting…' : csvState === 'done' ? 'Done ✓' : (
                <>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 12v2h12v-2M8 2v8M5 7l3 3 3-3" />
                  </svg>
                  Export CSV
                </>
              )}
            </button>
            <button className="btn-accent text-xs px-3 py-1.5" onClick={pushAll}>
              Send All → ReconDesk
            </button>
          </>
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

      {/* Severity filter pills */}
      <div
        className="flex items-center gap-1.5 px-4 py-2 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(7,8,15,0.3)' }}
      >
        <span className="text-[10px] uppercase tracking-widest flex-shrink-0" style={{ color: '#484f58', letterSpacing: '0.06em' }}>Sev</span>
        {SEVERITY_CONFIG.map(sev => {
          const isActive = severityFilter === sev.id;
          return (
            <button
              key={sev.id}
              className="text-[11px] px-2.5 py-0.5 rounded-full flex-shrink-0 transition-all font-medium"
              style={{
                background: isActive ? `${sev.color}18` : 'transparent',
                color: isActive ? sev.color : '#484f58',
                border: isActive ? `1px solid ${sev.color}40` : '1px solid transparent',
              }}
              onClick={() => setSeverityFilter(sev.id)}
            >
              {sev.label}
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
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  style={{ accentColor: '#b44fff', cursor: 'pointer' }}
                  checked={filtered.length > 0 && filtered.every(f => selected.has(f.id))}
                  onChange={() => toggleSelectAll(filtered.map(f => f.id))}
                  title="Select all"
                />
              </div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Value</div>
              <div className="col-span-2">CVSS</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-2 text-right">Act.</div>
            </div>

            <AnimatePresence>
              {filtered.map((finding, rowIndex) => {
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
                    transition={{ duration: 0.14, delay: rowIndex * 0.04 }}
                    style={{
                      borderBottom: '1px solid rgba(42,51,71,0.35)',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div
                      className="grid grid-cols-12 px-4 py-2.5 text-xs cursor-pointer transition-colors"
                      style={{
                        background: isExpanded
                          ? 'rgba(13,14,24,0.8)'
                          : selected.has(finding.id)
                          ? 'rgba(180,79,255,0.06)'
                          : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!isExpanded && !selected.has(finding.id)) e.currentTarget.style.background = 'rgba(13,14,24,0.5)';
                      }}
                      onMouseLeave={e => {
                        if (!isExpanded) e.currentTarget.style.background = selected.has(finding.id) ? 'rgba(180,79,255,0.06)' : 'transparent';
                      }}
                      onClick={() => setExpanded(isExpanded ? null : finding.id)}
                    >
                      <div className="col-span-1 flex items-center" onClick={e => { e.stopPropagation(); toggleSelect(finding.id); }}>
                        <input
                          type="checkbox"
                          style={{ accentColor: '#b44fff', cursor: 'pointer' }}
                          checked={selected.has(finding.id)}
                          onChange={() => toggleSelect(finding.id)}
                        />
                      </div>

                      <div className="col-span-2 flex items-center">
                        <Badge variant={badgeVariant}>
                          {CATEGORY_ICONS[finding.category]} {getCategoryLabel(finding.category).slice(0, -1)}
                        </Badge>
                      </div>

                      <div className="col-span-3 flex items-center gap-1">
                        <span className="font-mono truncate" style={{ color: '#e6edf3' }}>
                          {finding.value}
                        </span>
                        {finding.validated && (
                          <span className="text-[10px]" style={{ color: '#3fb950' }}>✓</span>
                        )}
                      </div>

                      <div className="col-span-2 flex items-center gap-1.5">
                        {(() => {
                          const cvss = getMockCvss(finding.category, finding.value);
                          if (cvss === null) return <span style={{ color: '#484f58', fontSize: 11 }}>—</span>;
                          const c = cvssColor(cvss);
                          return (
                            <span
                              className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded"
                              style={{
                                color: c,
                                background: `${c}18`,
                                border: `1px solid ${c}40`,
                              }}
                              title={`CVSS ${cvss} — ${cvssLabel(cvss)}`}
                            >
                              {cvss.toFixed(1)}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="col-span-2 flex items-center font-mono text-[11px] tabular-nums" style={{ color: '#484f58' }}>
                        {new Date(finding.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
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
