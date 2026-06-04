import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { Source, SourceType, ConflictStrategy, SourceHealth } from '@shared/types';
import SectionHeader from './ui/SectionHeader';
import Button from './ui/Button';
import Badge from './ui/Badge';

// ── Health indicator ──────────────────────────────────────────────────────────

function HealthDot({ health }: { health?: SourceHealth }) {
  const [show, setShow] = useState(false);
  const status = health?.status ?? 'unknown';
  const colorMap: Record<string, string> = {
    healthy: '#3fb950', warning: '#d29922', error: '#f85149', unknown: 'var(--text-dim)',
  };
  const color = colorMap[status];

  function fmt(ts?: string) {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  }

  return (
    <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span
        className="w-2 h-2 rounded-full shrink-0 cursor-default"
        style={{ background: color, boxShadow: status === 'error' ? `0 0 6px ${color}` : undefined }}
      />
      {show && (
        <div
          className="absolute left-4 top-0 z-50 w-56 rounded-lg p-3 text-[10px] space-y-1 pointer-events-none"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          <div className="flex justify-between">
            <span>Status</span>
            <span style={{ color }}>{status}</span>
          </div>
          <div className="flex justify-between">
            <span>Last success</span>
            <span>{fmt(health?.lastSuccess)}</span>
          </div>
          <div className="flex justify-between">
            <span>Failures</span>
            <span style={{ color: (health?.consecutiveFailures ?? 0) > 0 ? '#f85149' : 'inherit' }}>
              {health?.consecutiveFailures ?? 0}
            </span>
          </div>
          {health?.lastError && (
            <div className="pt-1 border-t" style={{ borderColor: 'var(--border-default)', color: '#f85149' }}>
              {health.lastError.slice(0, 80)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'obsidian-publish': 'Obsidian Publish', 'website': 'Website', 'github': 'GitHub',
  'youtube': 'YouTube', 'pdf': 'PDF', 'reddit': 'Reddit', 'twitter': 'Twitter / X',
  'notion': 'Notion', 'medium': 'Medium', 'cve': 'CVE / NVD', 'rss': 'RSS Feed',
};

const TYPE_COLORS: Record<SourceType, string> = {
  'obsidian-publish': '#7c3aed', 'website': '#0284c7', 'github': '#6b7280',
  'youtube': '#dc2626', 'pdf': '#b45309', 'reddit': '#ea580c', 'twitter': '#0369a1',
  'notion': '#1d4ed8', 'medium': '#15803d', 'cve': '#be123c', 'rss': '#d97706',
};

const CONFLICT_OPTIONS: Array<{ value: ConflictStrategy; label: string }> = [
  { value: 'skip', label: 'Skip existing' }, { value: 'overwrite', label: 'Overwrite' },
  { value: 'keepBoth', label: 'Keep both' }, { value: 'ask', label: 'Ask me' },
];

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];

interface AddForm {
  name: string; type: SourceType; url: string;
  cronExpression: string; conflictStrategy: ConflictStrategy;
}

const DEFAULT_FORM: AddForm = { name: '', type: 'website', url: '', cronExpression: '', conflictStrategy: 'skip' };

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)',
};

export default function SourcesView() {
  const { sources, setSources, addLog } = useStore();
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState<AddForm>(DEFAULT_FORM);
  const [editId, setEditId]         = useState<string | null>(null);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  function updateForm(patch: Partial<AddForm>) { setForm(f => ({ ...f, ...patch })); }
  function startAdd() { setEditId(null); setForm(DEFAULT_FORM); setShowAdd(true); }
  function startEdit(s: Source) {
    setEditId(s.id);
    setForm({ name: s.name, type: s.type, url: s.url ?? '', cronExpression: s.schedule?.cronExpression ?? '', conflictStrategy: s.schedule?.conflictStrategy ?? 'skip' });
    setShowAdd(true);
  }
  function cancelForm() { setShowAdd(false); setEditId(null); setForm(DEFAULT_FORM); }

  async function saveSource() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Source> = {
        name: form.name.trim(), type: form.type, url: form.url.trim() || undefined, config: {},
        schedule: form.cronExpression ? { enabled: true, cronExpression: form.cronExpression, conflictStrategy: form.conflictStrategy } : undefined,
      };
      if (editId) {
        const updated = await window.electronAPI.updateSource(editId, payload);
        setSources(sources.map(s => s.id === editId ? updated : s));
      } else {
        const created = await window.electronAPI.addSource(payload);
        setSources([...sources, created]);
      }
      cancelForm();
    } finally { setSaving(false); }
  }

  async function deleteSource(id: string) {
    await window.electronAPI.deleteSource(id);
    setSources(sources.filter(s => s.id !== id));
  }

  async function scrapeNow(source: Source) {
    setScrapingId(source.id);
    try {
      const result = await window.electronAPI.scrapeSourceNow(source.id);
      if (result.success) {
        addLog({ type: 'success', message: `Scraped "${source.name}" successfully`, time: new Date().toLocaleTimeString() });
      } else {
        addLog({ type: 'error', message: `Failed to scrape "${source.name}": ${result.error}`, time: new Date().toLocaleTimeString() });
      }
      const updated = await window.electronAPI.getSources();
      setSources(updated);
    } finally { setScrapingId(null); }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-default)' }}>
        <SectionHeader
          title="Source Library"
          subtitle={`${sources.length} source${sources.length !== 1 ? 's' : ''} configured`}
        />
        <Button variant="primary" size="sm" onClick={startAdd}>+ Add Source</Button>
      </div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-b"
            style={{ borderColor: 'var(--border-default)', background: 'var(--surface-2)' }}
          >
            <div className="p-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                {editId ? 'Edit Source' : 'New Source'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Name', el: (
                    <input className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                      value={form.name} onChange={e => updateForm({ name: e.target.value })} placeholder="My source name" />
                  )},
                  { label: 'Type', el: (
                    <select className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                      value={form.type} onChange={e => updateForm({ type: e.target.value as SourceType })}>
                      {SOURCE_TYPES.map(t => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}
                    </select>
                  )},
                  { label: 'URL', el: (
                    <input className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                      value={form.url} onChange={e => updateForm({ url: e.target.value })} placeholder="https://…" />
                  )},
                  { label: 'Schedule (cron)', el: (
                    <input className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}
                      value={form.cronExpression} onChange={e => updateForm({ cronExpression: e.target.value })} placeholder="0 9 * * * (optional)" />
                  )},
                  { label: 'Conflict Strategy', el: (
                    <select className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                      value={form.conflictStrategy} onChange={e => updateForm({ conflictStrategy: e.target.value as ConflictStrategy })}>
                      {CONFLICT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )},
                ].map(({ label, el }) => (
                  <div key={label}>
                    <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    {el}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={cancelForm}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={saveSource} disabled={saving || !form.name.trim()} loading={saving}>
                  {editId ? 'Save Changes' : 'Add Source'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source list */}
      <div className="flex-1 overflow-auto p-5">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-4xl mb-3">📚</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No sources yet</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Add sources to schedule automatic scrapes
            </div>
            <Button variant="primary" size="sm" onClick={startAdd}>Add your first source</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map(source => (
              <motion.div
                key={source.id}
                layout
                className="flex items-center gap-4 p-4 rounded-lg border transition-colors"
                style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              >
                <HealthDot health={source.health} />

                {/* Type badge */}
                <div className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase"
                  style={{
                    background: `${TYPE_COLORS[source.type]}18`,
                    color: TYPE_COLORS[source.type],
                    border: `1px solid ${TYPE_COLORS[source.type]}35`,
                  }}>
                  {source.type}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{source.name}</div>
                  {source.url && (
                    <div className="text-[11px] font-mono truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {source.url}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {source.lastScraped && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Last: {new Date(source.lastScraped).toLocaleDateString()}
                      </span>
                    )}
                    {source.noteCount != null && (
                      <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {source.noteCount} notes
                      </span>
                    )}
                    {source.schedule?.cronExpression && (
                      <Badge variant="accent">⏱ {source.schedule.cronExpression}</Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="primary" size="xs"
                    onClick={() => scrapeNow(source)}
                    disabled={scrapingId === source.id}
                    loading={scrapingId === source.id}
                  >
                    Scrape
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => startEdit(source)}>Edit</Button>
                  <Button variant="danger" size="xs" onClick={() => deleteSource(source.id)}>Delete</Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
