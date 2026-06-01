import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { Snippet } from '../lib/snippets';
import { search, sortSnippets, add, update, remove, getAllTags, serialize, load } from '../lib/snippets';
import { SOUNDS } from '../lib/sounds';

export default function Snippets() {
  const { snippetsData, setSnippetsData } = useStore();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('recent');
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', command: '', tags: '', notes: '' });
  const [copied, setCopied] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    load(snippetsData);
  }, [snippetsData]);

  function refresh() {
    const data = serialize();
    setSnippetsData(data);
    window.electronAPI.saveSnippets(data).catch(() => {});
    forceUpdate(n => n + 1);
  }

  const allSnippets = search(query, selectedTags);
  const sorted = sortSnippets(allSnippets, sortBy);
  const tags = getAllTags();

  function openEdit(s: Snippet) {
    setEditing(s);
    setCreating(false);
    setForm({ name: s.name, command: s.command, tags: s.tags.join(', '), notes: s.notes });
  }

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ name: '', command: '', tags: '', notes: '' });
  }

  function save() {
    if (creating) {
      add({ name: form.name, command: form.command, tags: form.tags, notes: form.notes });
    } else if (editing) {
      update(editing.id, { name: form.name, command: form.command, tags: form.tags, notes: form.notes });
    }
    refresh();
    setCreating(false);
    setEditing(null);
  }

  function deleteSnippet(id: string) {
    remove(id);
    refresh();
  }

  async function copySnippet(cmd: string, id: string) {
    await navigator.clipboard.writeText(cmd);
    SOUNDS.click();
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search snippets..."
            className="flex-1 text-xs"
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs" style={{ width: 'auto' }}>
            <option value="recent">Recent</option>
            <option value="most-used">Most Used</option>
            <option value="alpha">A-Z</option>
          </select>
          <button className="btn-accent px-3 py-1.5 text-xs" onClick={openCreate}>+ New</button>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border)] flex-wrap">
            {tags.map(tag => (
              <button
                key={tag}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  selectedTags.includes(tag) ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'badge'
                }`}
                onClick={() => setSelectedTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Snippets */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sorted.length === 0 && (
            <div className="text-center text-[var(--text-muted)] text-sm mt-8">
              {query ? 'No snippets match your search.' : 'No snippets yet. Create one!'}
            </div>
          )}
          {sorted.map(s => (
            <div key={s.id} className="card hover:border-[var(--accent-dim)] transition-colors group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--text)] mb-1">{s.name}</div>
                  <div className="font-mono text-xs text-[var(--accent)] truncate">{s.command}</div>
                  {s.notes && <div className="text-[10px] text-[var(--text-muted)] mt-1">{s.notes}</div>}
                  {s.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {s.tags.map(t => <span key={t} className="badge text-[10px] px-1.5">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: copied === s.id ? 'var(--success)' : 'var(--accent-dim)', color: copied === s.id ? '#fff' : 'var(--accent)', border: '1px solid var(--accent)' }}
                    onClick={() => copySnippet(s.command, s.id)}
                  >
                    {copied === s.id ? '✓' : 'Copy'}
                  </button>
                  <button className="btn-ghost text-xs px-2 py-1" onClick={() => openEdit(s)}>Edit</button>
                  <button className="btn-danger text-xs px-2 py-1" onClick={() => deleteSnippet(s.id)}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Create form */}
      {(creating || editing) && (
        <div className="w-72 border-l border-[var(--border)] p-4 flex-shrink-0">
          <h3 className="text-xs font-semibold text-[var(--text)] mb-3">{creating ? 'New Snippet' : 'Edit Snippet'}</h3>
          <div className="space-y-3">
            <div className="input-group">
              <label>Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full" placeholder="Snippet name" />
            </div>
            <div className="input-group">
              <label>Command</label>
              <textarea value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} className="w-full font-mono text-xs" rows={4} placeholder="Command or text..." />
            </div>
            <div className="input-group">
              <label>Tags (comma separated)</label>
              <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full" placeholder="nmap, recon, linux" />
            </div>
            <div className="input-group">
              <label>Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full" placeholder="Optional notes" />
            </div>
            <div className="flex gap-2">
              <button className="btn-accent flex-1 py-2 text-xs" onClick={save}>Save</button>
              <button className="btn-ghost flex-1 py-2 text-xs" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
