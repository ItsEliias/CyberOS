import { useState, useEffect, useRef, useMemo } from 'react';

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  action: () => void;
}

interface Props {
  items: PaletteItem[];
  onClose: () => void;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(0,255,65,0.25)', color: 'var(--accent)', borderRadius: 1 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({ items, onClose }: Props) {
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => { setSelected(0); }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      filtered[selected].action();
      onClose();
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div style={{
        width: 560,
        background: 'var(--panel)',
        border: '1px solid var(--accent)',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>{'>'}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search actions, snippets, SSH profiles..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ESC</span>
        </div>

        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No results
            </div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item.id}
              onClick={() => { item.action(); onClose(); }}
              style={{
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                background: i === selected ? 'rgba(0,255,65,0.08)' : 'transparent',
                borderLeft: i === selected ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {highlight(item.label, query)}
                </div>
                {item.description && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {highlight(item.description, query)}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 9, color: 'var(--text-muted)',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 2, padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase',
              }}>
                {item.category}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: '5px 12px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>ESC close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
