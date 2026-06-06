import { useState, useEffect, useRef, useMemo } from 'react';
import HelpIcon from './ui/HelpIcon';

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

const RECENT_KEY = 'terminallink_palette_recent';
const MAX_RECENT = 3;

function getRecentIds(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); }
  catch { return []; }
}

function addRecentId(id: string) {
  const prev = getRecentIds().filter(x => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
}

/**
 * Compute a 1-5 integer match score for a palette item against the query.
 * Higher = better match: exact label match → 5, starts-with → 4,
 * includes (label) → 3, description match → 2, category match → 1.
 */
function matchScore(item: PaletteItem, query: string): number {
  if (!query) return 0;
  const q    = query.toLowerCase();
  const lbl  = item.label.toLowerCase();
  const desc = (item.description ?? '').toLowerCase();
  const cat  = item.category.toLowerCase();
  if (lbl === q)                    return 5;
  if (lbl.startsWith(q))            return 4;
  if (lbl.includes(q))              return 3;
  if (desc.includes(q))             return 2;
  if (cat.includes(q))              return 1;
  return 1; // fallback — item is in filtered so must match something
}

/** 3–5 filled squares representing match quality */
function MatchScoreBars({ score }: { score: number }) {
  const MAX = 5;
  return (
    <span
      title={`Match score ${score}/${MAX}`}
      style={{ display: 'inline-flex', gap: 2, flexShrink: 0, alignItems: 'center' }}
    >
      {Array.from({ length: MAX }).map((_, i) => {
        const filled = i < score;
        return (
          <span
            key={i}
            style={{
              width: 4, height: 8, borderRadius: 1,
              background: filled ? `rgba(0,255,65,${0.25 + (i / MAX) * 0.65})` : 'rgba(0,255,65,0.08)',
              transition: 'background 0.15s ease',
              flexShrink: 0,
            }}
          />
        );
      })}
    </span>
  );
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
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentIds());
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  const recentItems = useMemo(() =>
    recentIds.map(id => items.find(i => i.id === id)).filter(Boolean) as PaletteItem[],
    [recentIds, items]
  );

  function handleSelect(item: PaletteItem) {
    addRecentId(item.id);
    setRecentIds(getRecentIds());
    item.action();
    onClose();
  }

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
      handleSelect(filtered[selected]);
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div style={{
        width: 560,
        background: 'rgba(13,18,8,0.97)',
        border: '1px solid rgba(0,255,65,0.45)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,255,65,0.12), 0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,255,65,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', flexShrink: 0, fontWeight: 700, textShadow: '0 0 8px rgba(0,255,65,0.5)' }}>{'>'}</span>
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
          <kbd style={{
            fontSize: 9, color: 'rgba(0,255,65,0.4)',
            background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.15)',
            borderRadius: 4, padding: '2px 6px', fontFamily: 'var(--font-mono)',
          }}>ESC</kbd>
          <HelpIcon text="Fuzzy-search every action, view, snippet, and SSH profile. Use ↑↓ to navigate and Enter to execute. Opened with Cmd+Shift+P." />
        </div>

        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto' }}>
          {/* Recently used section — only when no active query */}
          {!query.trim() && recentItems.length > 0 && (
            <div>
              <div style={{
                padding: '5px 14px 3px',
                fontSize: 9, color: 'rgba(0,255,65,0.35)',
                textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
                borderBottom: '1px solid rgba(0,255,65,0.07)',
                background: 'rgba(0,255,65,0.03)',
                fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 10 }}>↺</span>
                Recently used
              </div>
              {recentItems.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    background: i === selected ? 'rgba(0,255,65,0.07)' : 'transparent',
                    borderLeft: i === selected ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 8, padding: '1px 5px', borderRadius: 2,
                    background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.12)',
                    color: 'rgba(0,255,65,0.35)', fontFamily: 'var(--font-mono)', flexShrink: 0,
                  }}>{item.category}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'rgba(0,255,65,0.07)', margin: '2px 0' }} />
            </div>
          )}
          {filtered.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.3 }}>⌕</div>
              No results for "{query}"
            </div>
          )}
          {(() => {
            // Group items by category and render with section dividers
            const CATEGORY_ORDER = ['Navigation', 'Sessions', 'Settings'];
            const grouped: Record<string, typeof filtered> = {};
            for (const item of filtered) {
              const cat = item.category || 'Other';
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(item);
            }
            // Order: known categories first, then others
            const cats = [
              ...CATEGORY_ORDER.filter(c => grouped[c]),
              ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)),
            ];
            // Build a flat indexed list for keyboard navigation
            const flatItems: (typeof filtered[0])[] = [];
            for (const cat of cats) flatItems.push(...grouped[cat]);

            return cats.map(cat => (
              <div key={cat}>
                {/* Category divider */}
                <div style={{
                  padding: '5px 14px 3px',
                  fontSize: 9, color: 'rgba(0,255,65,0.35)',
                  textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
                  borderBottom: '1px solid rgba(0,255,65,0.07)',
                  background: 'rgba(0,255,65,0.02)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {cat}
                </div>
                {grouped[cat].map(item => {
                  const i = flatItems.indexOf(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      style={{
                        padding: '8px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        background: i === selected ? 'rgba(0,255,65,0.07)' : 'transparent',
                        borderLeft: i === selected ? '2px solid var(--accent)' : '2px solid transparent',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={() => setSelected(i)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: i === selected ? 'var(--text-primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {highlight(item.label, query)}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {highlight(item.description, query)}
                          </div>
                        )}
                      </div>
                      {query.trim() && (
                        <MatchScoreBars score={matchScore(item, query)} />
                      )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>

        <div style={{
          padding: '6px 14px', borderTop: '1px solid rgba(0,255,65,0.08)',
          fontSize: 10, color: 'rgba(0,255,65,0.3)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {[['↑↓', 'navigate'], ['↵', 'select'], ['ESC', 'close']].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{
                fontSize: 9, background: 'rgba(0,255,65,0.06)', border: '1px solid rgba(0,255,65,0.12)',
                borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)',
                color: 'rgba(0,255,65,0.45)',
              }}>{key}</kbd>
              <span>{label}</span>
            </span>
          ))}
          <span style={{ marginLeft: 'auto' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
