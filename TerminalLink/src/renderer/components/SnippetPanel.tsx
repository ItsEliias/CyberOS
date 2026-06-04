import { useState, useMemo } from 'react';
import type { Snippet } from '../types/terminallink';

interface Props {
  snippets: Snippet[];
  onPaste: (command: string) => void;
  onClose: () => void;
  onAdd: (s: Snippet) => void;
  onRemove: (id: string) => void;
}

export default function SnippetPanel({ snippets, onPaste, onClose, onAdd, onRemove }: Props) {
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState('All');
  const [adding,   setAdding]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCmd,   setNewCmd]   = useState('');
  const [newCat,   setNewCat]   = useState('Custom');

  const categories = useMemo(() => {
    const cats = new Set(snippets.map(s => s.category));
    return ['All', ...Array.from(cats).sort()];
  }, [snippets]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return snippets.filter(s => {
      const matchCat = category === 'All' || s.category === category;
      const matchQ   = !q || s.title.toLowerCase().includes(q) || s.command.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [snippets, query, category]);

  function handleAdd() {
    if (!newTitle.trim() || !newCmd.trim()) return;
    onAdd({
      id:       `custom-${Date.now()}`,
      title:    newTitle.trim(),
      command:  newCmd.trim(),
      category: newCat.trim() || 'Custom',
    });
    setNewTitle(''); setNewCmd(''); setAdding(false);
  }

  return (
    <div style={{
      width: 280,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--panel)',
      borderRight: '1px solid var(--border)',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)' }}>
          Snippets
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setAdding(a => !a)}
            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: adding ? 'var(--accent-dim)' : 'var(--bg)', border: `1px solid ${adding ? 'var(--accent)' : 'var(--border)'}`, color: adding ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer' }}
          >
            + New
          </button>
          <button onClick={onClose} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter snippets..."
          style={{
            width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '4px 6px', color: 'var(--text)', fontSize: 11,
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid var(--border)',
        flexShrink: 0, scrollbarWidth: 'none',
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              fontSize: 9, padding: '4px 8px', cursor: 'pointer', flexShrink: 0,
              background: 'none', border: 'none',
              color: category === cat ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: category === cat ? '2px solid var(--accent)' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" style={inputStyle} />
          <input value={newCmd}   onChange={e => setNewCmd(e.target.value)}   placeholder="Command" style={inputStyle} />
          <input value={newCat}   onChange={e => setNewCat(e.target.value)}   placeholder="Category" style={inputStyle} />
          <button onClick={handleAdd} style={{ fontSize: 10, padding: '4px 0', borderRadius: 3, background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer' }}>
            Add Snippet
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No snippets</div>
        )}
        {filtered.map(snippet => (
          <div
            key={snippet.id}
            style={{
              padding: '7px 10px', borderBottom: '1px solid rgba(42,51,71,0.5)',
              cursor: 'pointer',
            }}
            onClick={() => onPaste(snippet.command)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--text)', flex: 1 }}>{snippet.title}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 2, padding: '1px 4px', flexShrink: 0 }}>
                {snippet.category}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <code style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {snippet.command}
              </code>
              {snippet.id.startsWith('custom-') && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(snippet.id); }}
                  style={{ fontSize: 9, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 3, padding: '4px 6px', color: 'var(--text)', fontSize: 11,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
