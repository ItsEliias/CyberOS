// GhostVault — Search View (Screen 2)
// Full-text search across all vault files

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import HelpTip from './ui/HelpTip';
import type { NoteFile } from '@shared/types';

interface SearchMatch {
  note: NoteFile;
  snippet: string;
  matchStart: number;
  matchEnd: number;
}

interface Props {
  onOpenNote: (note: NoteFile) => void;
}

function highlightSnippet(text: string, query: string): { before: string; match: string; after: string } {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return { before: text.slice(0, 80), match: '', after: '' };
  const before = text.slice(Math.max(0, idx - 30), idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length, idx + query.length + 60);
  return { before: (idx > 30 ? '…' : '') + before, match, after: after + (after.length === 60 ? '…' : '') };
}

export default function SearchView({ onOpenNote }: Props) {
  const { vaultPath, notes } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !vaultPath) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const lower = q.toLowerCase();
      const matches: SearchMatch[] = [];
      for (const note of notes) {
        const nameMatch = note.name.toLowerCase().includes(lower);
        let snippet = '';
        let matchStart = 0;
        let matchEnd = 0;
        if (nameMatch) {
          snippet = note.name;
          matchStart = note.name.toLowerCase().indexOf(lower);
          matchEnd = matchStart + lower.length;
        }
        // Try reading file content for content matches
        try {
          const content = await window.ghostvault.readNote(note.path);
          const contentLower = content.toLowerCase();
          const idx = contentLower.indexOf(lower);
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const prefix = start > 0 ? '…' : '';
            snippet = prefix + content.slice(start, idx + lower.length + 80);
            matchStart = start > 0 ? lower.length + 1 : idx - start;
            matchEnd = matchStart + lower.length;
          } else if (!nameMatch) {
            continue;
          }
        } catch {
          if (!nameMatch) continue;
        }
        matches.push({ note, snippet, matchStart, matchEnd });
        if (matches.length >= 50) break;
      }
      setResults(matches);
    } finally {
      setIsSearching(false);
    }
  }, [vaultPath, notes]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 250);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setQuery('');
  }

  const grouped = {
    cyberlab: results.filter(r => r.note.folder.toLowerCase().includes('cyberlab') || r.note.folder.toLowerCase().includes('lab')),
    tags: results.filter(r => {
      const q = query.replace(/^#/, '');
      return r.note.name.toLowerCase().includes(q);
    }),
    rest: results.filter(r =>
      !r.note.folder.toLowerCase().includes('cyberlab') &&
      !r.note.folder.toLowerCase().includes('lab')
    ),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-dim)' }}>
            Search
          </span>
          <HelpTip
            title="Search"
            body="Full-text search across every note in your vault. Matches against note titles and body content; use #tag to bias toward tag matches. Results group by location."
          />
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search notes by content, title, or #tag…"
            className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.9rem',
            }}
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: 'var(--accent)' }}>
              Searching…
            </div>
          )}
        </div>
        {query && !isSearching && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
            {results.length === 0 ? 'No results' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Search your vault</div>
            <div className="text-xs" style={{ color: 'var(--text-dim)', opacity: 0.7 }}>
              Search across all notes by title, content, or tags
            </div>
          </div>
        )}

        {query.trim() && results.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No notes match "{query}"</div>
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <div className="space-y-6">
              {grouped.rest.length > 0 && (
                <ResultGroup label="Best Match" results={grouped.rest.slice(0, 20)} query={query} onOpenNote={onOpenNote} />
              )}
              {grouped.cyberlab.length > 0 && (
                <ResultGroup label="In CyberLab" results={grouped.cyberlab} query={query} onOpenNote={onOpenNote} />
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultGroup({ label, results, query, onOpenNote }: {
  label: string;
  results: SearchMatch[];
  query: string;
  onOpenNote: (note: NoteFile) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      <div className="space-y-1">
        {results.map((r, i) => {
          const { before, match, after } = highlightSnippet(r.snippet, query);
          return (
            <motion.button
              key={r.note.path}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onOpenNote(r.note)}
              className="w-full text-left px-4 py-3 rounded-lg border transition-all hover:scale-[1.01] group"
              style={{
                background: 'var(--bg3)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{r.note.name}</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                  {r.note.folder}
                </span>
              </div>
              {r.snippet && (
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {before}
                  {match && (
                    <span className="px-0.5 rounded" style={{ background: 'rgba(123,184,255,0.2)', color: '#7bb8ff' }}>
                      {match}
                    </span>
                  )}
                  {after}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
