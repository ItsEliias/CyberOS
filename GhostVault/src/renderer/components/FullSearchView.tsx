import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { NoteFile } from '@shared/types';

interface Match {
  before: string;
  hit: string;
  after: string;
}

interface NoteResult {
  note: NoteFile;
  matches: Match[];
}

interface Props {
  onOpenNote: (note: NoteFile) => void;
}

function extractMatches(content: string, query: string): Match[] {
  const lower = query.toLowerCase();
  const results: Match[] = [];
  let start = 0;
  const c = content.toLowerCase();
  while (results.length < 4) {
    const idx = c.indexOf(lower, start);
    if (idx === -1) break;
    const s = Math.max(0, idx - 50);
    const e = Math.min(content.length, idx + lower.length + 50);
    results.push({
      before: (s > 0 ? '…' : '') + content.slice(s, idx),
      hit: content.slice(idx, idx + query.length),
      after: content.slice(idx + query.length, e) + (e < content.length ? '…' : ''),
    });
    start = idx + query.length;
  }
  return results;
}

export default function FullSearchView({ onOpenNote }: Props) {
  const { notes, vaultPath } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !vaultPath) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const lower = q.toLowerCase();
    const found: NoteResult[] = [];
    for (const note of notes) {
      if (found.length >= 30) break;
      const nameHit = note.name.toLowerCase().includes(lower);
      try {
        const content = await window.ghostvault.readNote(note.path);
        const matches = extractMatches(content, q);
        if (matches.length > 0 || nameHit) {
          found.push({ note, matches });
        }
      } catch {
        if (nameHit) found.push({ note, matches: [] });
      }
    }
    setResults(found);
    setSearching(false);
  }, [notes, vaultPath]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 200);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Full-Text Search</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg3)', color: 'var(--text-dim)' }}>
            Cmd+Shift+F
          </span>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--text-dim)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input ref={inputRef} value={query} onChange={handleChange}
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
            placeholder="Search all notes…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            autoFocus
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] animate-pulse"
              style={{ color: 'var(--accent)' }}>Searching…</div>
          )}
        </div>
        {query && !searching && (
          <div className="mt-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
            {results.length === 0 ? 'No results' : `${results.length} notes`}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {!query && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ color: 'var(--text-dim)', opacity: 0.3 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>Search all note content</div>
          </div>
        )}

        <AnimatePresence>
          {results.map((r, i) => (
            <motion.div key={r.note.path}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}>
              <button onClick={() => onOpenNote(r.note)}
                className="w-full text-left rounded-lg border p-3 transition-all hover:scale-[1.005] group"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{r.note.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{r.note.folder}</span>
                </div>
                {r.matches.map((m, mi) => (
                  <div key={mi} className="text-xs leading-relaxed mb-1 font-mono"
                    style={{ color: 'var(--text-muted)' }}>
                    {m.before}
                    <span className="px-0.5 rounded"
                      style={{ background: 'rgba(123,184,255,0.2)', color: '#7bb8ff' }}>
                      {m.hit}
                    </span>
                    {m.after}
                  </div>
                ))}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
