import { useState, useEffect } from 'react';

type KBCategory = 'Commands' | 'Payloads' | 'Theory' | 'References';

interface KBNote {
  id: string;
  title: string;
  content: string;
  category: KBCategory;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'cyberlab-kb-notes';
const CATEGORIES: KBCategory[] = ['Commands', 'Payloads', 'Theory', 'References'];

const CAT_COLORS: Record<KBCategory, string> = {
  Commands:   '#4a9eff',
  Payloads:   '#f85149',
  Theory:     '#b44fff',
  References: '#3fb950',
};

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function loadNotes(): KBNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveNotes(notes: KBNote[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
}

export default function KnowledgeBase() {
  const [notes, setNotes] = useState<KBNote[]>(() => loadNotes());
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<KBCategory | 'All'>('All');
  const [editing, setEditing] = useState<KBNote | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'Commands' as KBCategory });

  useEffect(() => { saveNotes(notes); }, [notes]);

  const filtered = notes.filter(n => {
    const matchCat = filterCat === 'All' || n.category === filterCat;
    const q = search.toLowerCase();
    const matchQ = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  function openCreate() {
    setForm({ title: '', content: '', category: 'Commands' });
    setCreating(true);
    setEditing(null);
  }

  function openEdit(note: KBNote) {
    setForm({ title: note.title, content: note.content, category: note.category });
    setEditing(note);
    setCreating(false);
  }

  function save() {
    const now = new Date().toISOString();
    if (creating) {
      const note: KBNote = { id: makeId(), ...form, createdAt: now, updatedAt: now };
      setNotes(ns => [note, ...ns]);
    } else if (editing) {
      setNotes(ns => ns.map(n => n.id === editing.id ? { ...n, ...form, updatedAt: now } : n));
    }
    setCreating(false);
    setEditing(null);
  }

  function deleteNote(id: string) {
    setNotes(ns => ns.filter(n => n.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  const showForm = creating || !!editing;

  return (
    <div className="flex h-full">
      {/* Left: list */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search knowledge base..."
            className="flex-1 text-xs"
          />
          <button className="btn-accent text-xs px-3 py-1.5" onClick={openCreate}>+ New</button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            className="text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{
              background: filterCat === 'All' ? 'var(--accent-dim)' : 'transparent',
              color: filterCat === 'All' ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${filterCat === 'All' ? 'var(--accent)' : 'var(--border)'}`,
            }}
            onClick={() => setFilterCat('All')}
          >
            All ({notes.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className="text-[10px] px-2 py-0.5 rounded transition-colors"
              style={{
                background: filterCat === cat ? CAT_COLORS[cat] + '22' : 'transparent',
                color: filterCat === cat ? CAT_COLORS[cat] : 'var(--text-muted)',
                border: `1px solid ${filterCat === cat ? CAT_COLORS[cat] : 'var(--border)'}`,
              }}
              onClick={() => setFilterCat(cat)}
            >
              {cat} ({notes.filter(n => n.category === cat).length})
            </button>
          ))}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-sm mt-8" style={{ color: 'var(--text-muted)' }}>
              {search || filterCat !== 'All' ? 'No notes match your filter.' : 'Your knowledge base is empty. Create your first note.'}
            </div>
          )}
          {filtered.map(note => (
            <div
              key={note.id}
              className="card group hover:border-[var(--accent-dim)] transition-colors cursor-pointer"
              onClick={() => openEdit(note)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: CAT_COLORS[note.category] + '22', color: CAT_COLORS[note.category] }}
                    >
                      {note.category}
                    </span>
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{note.title}</span>
                  </div>
                  <div className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                    {note.content.slice(0, 100)}{note.content.length > 100 ? '...' : ''}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded transition-opacity"
                  style={{ color: 'var(--error)', border: 'none', background: 'transparent' }}
                  onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: editor */}
      {showForm && (
        <div className="w-80 flex flex-col flex-shrink-0" style={{ borderLeft: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
              {creating ? 'New Note' : 'Edit Note'}
            </span>
            <button
              className="text-xs"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}
              onClick={() => { setCreating(false); setEditing(null); }}
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-3 flex-1 flex flex-col">
            <div className="input-group">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full"
                placeholder="Note title..."
                autoFocus
              />
            </div>
            <div className="input-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as KBCategory }))}
                className="w-full text-xs"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group flex-1 flex flex-col">
              <label>Content (Markdown)</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="flex-1 font-mono text-xs resize-none"
                style={{ minHeight: 200 }}
                placeholder="# Notes&#10;&#10;Content here..."
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-accent flex-1 py-2 text-xs" onClick={save} disabled={!form.title.trim()}>
                Save
              </button>
              <button className="btn-ghost flex-1 py-2 text-xs" onClick={() => { setCreating(false); setEditing(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
