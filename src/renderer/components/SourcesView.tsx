import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { Source, SourceType, ConflictStrategy } from '@shared/types';

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'obsidian-publish': 'Obsidian Publish',
  'website':          'Website',
  'github':           'GitHub',
  'youtube':          'YouTube',
  'pdf':              'PDF',
  'reddit':           'Reddit',
  'twitter':          'Twitter / X',
  'notion':           'Notion',
  'medium':           'Medium',
  'cve':              'CVE / NVD',
  'rss':              'RSS Feed',
};

const TYPE_COLORS: Record<SourceType, string> = {
  'obsidian-publish': '#7c3aed',
  'website':          '#0284c7',
  'github':           '#6b7280',
  'youtube':          '#dc2626',
  'pdf':              '#b45309',
  'reddit':           '#ea580c',
  'twitter':          '#0369a1',
  'notion':           '#1d4ed8',
  'medium':           '#15803d',
  'cve':              '#be123c',
  'rss':              '#d97706',
};

const CONFLICT_OPTIONS: Array<{ value: ConflictStrategy; label: string }> = [
  { value: 'skip',      label: 'Skip existing' },
  { value: 'overwrite', label: 'Overwrite' },
  { value: 'keepBoth',  label: 'Keep both' },
  { value: 'ask',       label: 'Ask me' },
];

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];

interface AddForm {
  name: string;
  type: SourceType;
  url: string;
  cronExpression: string;
  conflictStrategy: ConflictStrategy;
}

const DEFAULT_FORM: AddForm = {
  name: '',
  type: 'website',
  url: '',
  cronExpression: '',
  conflictStrategy: 'skip',
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
    setForm({
      name:             s.name,
      type:             s.type,
      url:              s.url ?? '',
      cronExpression:   s.schedule?.cronExpression ?? '',
      conflictStrategy: s.schedule?.conflictStrategy ?? 'skip',
    });
    setShowAdd(true);
  }

  function cancelForm() { setShowAdd(false); setEditId(null); setForm(DEFAULT_FORM); }

  async function saveSource() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Source> = {
        name: form.name.trim(),
        type: form.type,
        url: form.url.trim() || undefined,
        config: {},
        schedule: form.cronExpression ? {
          enabled: true,
          cronExpression: form.cronExpression,
          conflictStrategy: form.conflictStrategy,
        } : undefined,
      };
      if (editId) {
        const updated = await window.electronAPI.updateSource(editId, payload);
        setSources(sources.map(s => s.id === editId ? updated : s));
      } else {
        const created = await window.electronAPI.addSource(payload);
        setSources([...sources, created]);
      }
      cancelForm();
    } finally {
      setSaving(false);
    }
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
    } finally {
      setScrapingId(null);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Source Library</div>
          <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {sources.length} source{sources.length !== 1 ? 's' : ''} configured
          </div>
        </div>
        <button
          onClick={startAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          + Add Source
        </button>
      </div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-b"
            style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
            <div className="p-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--accent)' }}>
                {editId ? 'Edit Source' : 'New Source'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Name</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    value={form.name} onChange={e => updateForm({ name: e.target.value })}
                    placeholder="My source name" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Type</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    value={form.type} onChange={e => updateForm({ type: e.target.value as SourceType })}>
                    {SOURCE_TYPES.map(t => (
                      <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>URL</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    value={form.url} onChange={e => updateForm({ url: e.target.value })}
                    placeholder="https://…" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Schedule (cron)</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    value={form.cronExpression} onChange={e => updateForm({ cronExpression: e.target.value })}
                    placeholder="0 9 * * * (optional)" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Conflict Strategy</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                    value={form.conflictStrategy}
                    onChange={e => updateForm({ conflictStrategy: e.target.value as ConflictStrategy })}>
                    {CONFLICT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={cancelForm}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button onClick={saveSource} disabled={saving || !form.name.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Source'}
                </button>
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
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No sources yet</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
              Add sources to schedule automatic scrapes
            </div>
            <button onClick={startAdd}
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Add your first source
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map(source => (
              <motion.div
                key={source.id}
                layout
                className="card flex items-center gap-4 p-4"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                {/* Type badge */}
                <div className="shrink-0 text-[10px] font-mono px-2 py-1 rounded font-semibold uppercase"
                  style={{
                    background: `${TYPE_COLORS[source.type]}22`,
                    color: TYPE_COLORS[source.type],
                    border: `1px solid ${TYPE_COLORS[source.type]}44`,
                  }}>
                  {source.type}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{source.name}</div>
                  {source.url && (
                    <div className="text-[11px] font-mono truncate mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {source.url}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {source.lastScraped && (
                      <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                        Last: {new Date(source.lastScraped).toLocaleDateString()}
                      </span>
                    )}
                    {source.noteCount != null && (
                      <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                        {source.noteCount} notes
                      </span>
                    )}
                    {source.schedule?.cronExpression && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
                        ⏱ {source.schedule.cronExpression}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => scrapeNow(source)}
                    disabled={scrapingId === source.id}
                    className="px-2.5 py-1 rounded text-[11px] border transition-all disabled:opacity-40"
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    {scrapingId === source.id ? '…' : 'Scrape'}
                  </button>
                  <button onClick={() => startEdit(source)}
                    className="px-2.5 py-1 rounded text-[11px] border transition-all hover:bg-white/5"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    Edit
                  </button>
                  <button onClick={() => deleteSource(source.id)}
                    className="px-2.5 py-1 rounded text-[11px] border transition-all hover:bg-red-500/10"
                    style={{ borderColor: 'var(--border)', color: '#f85149' }}>
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
